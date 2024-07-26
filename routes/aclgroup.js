if (ver('4.18.0')) {
    if (hostconfig.namuwiki_exclusive) router.get(/^\/self_unblock$/, async (req, res) => {
        const id = req.query['id'];
        var dbdata = await curs.execute("select type, username, aclgroup from aclgroup where id = ?", [id || '-1']);
        if (!dbdata.length) return res.status(400).send(await showError(req, 'aclgroup_not_found'));

        if (
            (islogin(req) && dbdata[0].type == 'username' && dbdata[0].username != ip_check(req)) ||
            (dbdata[0].type == 'ip' && !ipRangeCheck(ip_check(req, 1), dbdata[0].username))
        ) return res.status(400).send(await showError(req, 'aclgroup_not_found'));

        var dbdata2 = await curs.execute("select warning_description from aclgroup_groups where name = ?", [dbdata[0].aclgroup]);
        if (!dbdata2.length || !dbdata2[0].warning_description)
            return res.status(400).send(await showError(req, 'aclgroup_not_found'));

        await curs.execute("delete from aclgroup where id = ?", [id]);
        var logid = 1, data = await curs.execute('select logid from block_history order by cast(logid as integer) desc limit 1');
        if (data.length) logid = Number(data[0].logid) + 1;
        insert('block_history', {
            date: getTime(),
            type: 'aclgroup_remove',
            ismember: islogin(req) ? 'author' : 'ip',
            executer: ip_check(req),
            id,
            target: dbdata[0].username,
            note: '확인했습니다.',
            aclgroup: dbdata[0].aclgroup,
            logid,
        });
        return res.redirect('/edit/' + encodeURIComponent(req.query['document']));
    });

    router.all(/^\/aclgroup\/create$/, async (req, res, next) => {
        if (!['POST', 'GET'].includes(req.method)) return next();
        if (!hasperm(req, 'aclgroup')) return res.send(await showError(req, 'permission'));

        var content = `
            <form method=post>
                <div class=form-group>
                    <label>그룹 이름: </label>
                    <input type=text name=group class=form-control type=text />
                </div>

                ${hostconfig.namuwiki_exclusive ? `
                <div class=form-group>
                    <label>경고 그룹용 문구: </label>
                    <input class=form-control name="warning_description" type="text" /> 
                </div>
                ` : ''}

                <div class=form-group>
                    <label>사용자 이름 CSS: </label>
                    <input class=form-control name="css" type="text" /> 
                </div>

                <div class=form-group>
                    <label>가입 불가능: </label>
                    <input name="disallow_signup" type=checkbox value=Y /> 
                </div>

                <div class=btns>
                    <button type=submit class="btn btn-primary" style="width: 100px;">생성</button>
                </div>
            </form>
        `;

        var error = null;

        if (req.method == 'POST') do {
            const { group } = req.body;
            if (!group) {
                content = (error = err('alert', { code: 'validator_required', tag: 'group' })) + content;
                break;
            } else {
                var data = await curs.execute("select name from aclgroup_groups where name = ?", [group]);
                if (data.length) {
                    content = (error = err('alert', { code: 'aclgroup_already_exists' })) + content;
                    break;
                } else {
                    const css = req.body['css'] || (group == '차단된 사용자' ? 'text-decoration: line-through !important; color: gray !important;' : '');
                    await curs.execute("insert into aclgroup_groups (name, css, warning_description, disallow_signup) values (?, ?, ?, ?)", [group, css, req.body['warning_description'] || '', req.body.disallow_signup == 'Y' ? '1' : '0']);
                    aclgroupCache.css[group] = css;
                    return res.redirect('/aclgroup?group=' + encodeURIComponent(group));
                }
            }
        } while (0);

        res.send(await render(req, 'ACL그룹 생성', content, {}, '', error, _));
    });

    router.post(/^\/aclgroup\/delete$/, async (req, res, next) => {
        if (!hasperm(req, 'aclgroup')) return res.send(await showError(req, 'permission'));
        const { group } = req.body;
        if (!group) return res.redirect('/aclgroup');  // 귀찮음
        await curs.execute("delete from aclgroup_groups where name = ?", [group]);
        res.redirect('/aclgroup');
    });

    router.post(/^\/aclgroup\/remove$/, async (req, res) => {
        if (!hasperm(req, 'aclgroup') && !hasperm(req, 'admin')) return res.send(await showError(req, 'permission'));
        if (!req.body['id']) return res.status(400).send(await showError(req, { code: 'validator_required', tag: 'id' }));
        var dbdata = await curs.execute("select username, aclgroup from aclgroup where id = ?", [req.body['id']]);
        if (!dbdata.length) return res.status(400).send(await showError(req, 'invalid_value'));
        if (dbdata[0].aclgroup == '차단된 사용자' && !hasperm(req, 'admin'))
            return res.send(await showError(req, 'permission'));
        if (dbdata[0].aclgroup != '차단된 사용자' && !hasperm(req, 'aclgroup'))
            return res.send(await showError(req, 'permission'));
        await curs.execute("delete from aclgroup where id = ?", [req.body['id']]);
        var logid = 1, data = await curs.execute('select logid from block_history order by cast(logid as integer) desc limit 1');
        if (data.length) logid = Number(data[0].logid) + 1;
        insert('block_history', {
            date: getTime(),
            type: 'aclgroup_remove',
            ismember: islogin(req) ? 'author' : 'ip',
            executer: ip_check(req),
            id: req.body['id'],
            target: dbdata[0].username,
            note: req.body['note'] || '',
            aclgroup: dbdata[0].aclgroup,
            logid,
        });
        if (aclgroupCache.group[dbdata[0].username.toLowerCase()])
            aclgroupCache.group[dbdata[0].username.toLowerCase()].remove(dbdata[0].aclgroup);
        return res.redirect('/aclgroup?group=' + encodeURIComponent(dbdata[0].aclgroup));
    });

    router.all(/^\/aclgroup$/, async (req, res) => {
        if (!['POST', 'GET'].includes(req.method)) return next();

        var data = await curs.execute("select name from aclgroup_groups");
        var data2 = await curs.execute("select name from aclgroup_groups where not name = '차단된 사용자'");
        const groups = data.map(item => item.name);
        var editable = hasperm(req, 'aclgroup');
        if (req.query['group'] == '차단된 사용자')
            editable = hasperm(req, 'admin');
        var editabled = editable;

        var tabs = ``;
        var group = null;
        if (groups.includes(req.query['group'])) {
            if (req.query['group'] == '차단된 사용자' && !editable) {
                if (data2.length)
                    group = data2[0].name;
            } else {
                group = req.query['group'];
            }
        } else if (editable && data.length) {
            group = data[0].name;
        } else if (data2.length) {
            group = data2[0].name;
        }
        for (var g of data) {
            if (g.name == '차단된 사용자' && !editable) continue;
            const delbtn = `<form method=post onsubmit="return confirm('${g.name.replace(/\\/g, '\\\\').replace(/\'/g, '\\\'')} 그룹을 삭제하시겠습니까?');" action="/aclgroup/delete?group=${encodeURIComponent(g.name)}" style="display: inline-block; margin: 0; padding: 0;"><input type=hidden name=group value="${html.escape(g.name)}" /><button type=submit style="background: none; border: none; padding: 0; margin: 0;">×</button></form>`;
            tabs += `
                <li class="nav-item" style="display: inline-block;">
                    <a class="nav-link${g.name == group ? ' active' : ''}" href="?group=${encodeURIComponent(g.name)}">${html.escape(g.name)} ${editabled ? delbtn : ''}</a>
                </li>
            `;
        }

        var content = `
            <div id="aclgroup-create-modal" class="modal fade" role="dialog" aria-labelledby="exampleModalLabel" aria-hidden="true">
                <div class="modal-dialog" role="document">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">ACL 그룹 생성</h5>
                            <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <div class="modal-body">
                            <form action="/aclgroup/create" method="POST">
                                <div class="form-group">
                                    <label>그룹 이름:</label>
                                    <input class="form-control" type="text" name="group" required>
                                </div>
                                <div class="form-group">
                                    <label>사용자 이름 CSS:</label>
                                    <input class="form-control" type="text" name="css">
                                </div>
                                <div class="form-group">
                                    <label>경고 그룹용 문구:</label>
                                    <input class="form-control" type="text" name="warning_description">
                                </div>
                                <div class="form-group">
                                    <label>가입 불가능:</label>
                                    <input name="disallow_signup" type="checkbox" value="Y">
                                </div>
                                <button type="submit" class="btn btn-primary">생성</button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
            <div class="tab-content">
                <div class="tab-pane fade show active" id="aclgroup-tab">
                    <div class="card">
                        <div class="card-body">
                            <h5 class="card-title">ACL 그룹</h5>
                            <ul class="nav nav-tabs">
                                ${tabs}
                            </ul>
                            ${group ? `
                            <h5 class="mt-4">${group} 그룹의 사용자</h5>
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>사용자 이름</th>
                                        <th>액션</th>
                                    </tr>
                                </thead>
                                <tbody>
                            ` : `
                            <p>사용자가 없습니다.</p>
                            `}
                            ${group ? (await curs.execute("select username from aclgroup where aclgroup = ?", [group])).map(user => `
                                <tr>
                                    <td>${html.escape(user.username)}</td>
                                    <td>
                                        <form method=post action="/aclgroup/remove">
                                            <input type=hidden name=id value="${user.username}" />
                                            <input type=hidden name=note value="그룹에서 삭제됨" />
                                            <button type=submit class="btn btn-danger">삭제</button>
                                        </form>
                                    </td>
                                </tr>
                            `).join('') : ''}
                            ${group ? `
                                </tbody>
                            </table>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;

        res.send(await render(req, 'ACL 그룹', content, {}, '', null, _));
    });
}

// IPv4 정규식
const ipv4Regex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){2}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

// IPv6 정규식
const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,7}:|(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}|(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}|(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}|(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:(?::[0-9a-fA-F]{1,4}){1,6}|:((?::[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(?:[0-9a-fA-F]{0,4}:){0,4}([0-9a-fA-F]{1,4}|:)|::(ffff(:0{1,4}){0,1}:){0,1}(?:[0-9]{1,3}\.){3}[0-9]{1,3}|(?:[0-9a-fA-F]{1,4}:){1,4}:((?::[0-9a-fA-F]{1,4}){1,2}|:)|(?:[0-9a-fA-F]{1,4}:){1,3}:(?::[0-9a-fA-F]{1,4}){1,3}|(?:[0-9a-fA-F]{1,4}:){1,2}:(?::[0-9a-fA-F]{1,4}){1,4}|[0-9a-fA-F]{1,4}:(?::[0-9a-fA-F]{1,4}){1,5}|:((?::[0-9a-fA-F]{1,4}){1,6}|:)|[0-9a-fA-F]{1,4}:((?::[0-9a-fA-F]{1,4}){1,7}|:)|::/;

function ip_check(req, version = 0) {
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    if (version === 4) {
        return ipv4Regex.test(ip) ? ip : null;
    } else if (version === 6) {
        return ipv6Regex.test(ip) ? ip : null;
    }
    return ip;
}
		
		var data = await curs.execute("select username from users where lower(username) = ?", [username.toLowerCase()]);
		if(!data.length && mode != 'ip') { content = (error = err('alert', { code: 'invalid_username' })) + content; break; }
	
		const date = getTime();
		const expiration = expire == '0' ? '0' : String(Number(date) + Number(expire) * 1000);
		var data = await curs.execute("select username from aclgroup where aclgroup = ? and type = ? and username = ? limit 1", [group, mode, username]);
		if(data.length) { content = (error = err('alert', { code: 'aclgroup_already_exists' })) + content; break; }
		var data = await curs.execute("select id from aclgroup order by cast(id as integer) desc limit 1");
		var id = 1;
		if(data.length) id = Number(data[0].id) + 1;
		await curs.execute("insert into aclgroup (id, type, username, expiration, note, date, aclgroup) values (?, ?, ?, ?, ?, ?, ?)", [String(id), mode, username, expiration, note, date, group]);
		
		var logid = 1, data = await curs.execute('select logid from block_history order by cast(logid as integer) desc limit 1');
		if(data.length) logid = Number(data[0].logid) + 1;
		insert('block_history', {
			date: getTime(),
			type: 'aclgroup_add',
			aclgroup: group,
			id: String(id),
			duration: expire,
			note,
			ismember: islogin(req) ? 'author' : 'ip',
			executer: ip_check(req),
			target: username,
			logid,
		});
		if(!aclgroupCache.group[username.toLowerCase()])
			aclgroupCache.group[username.toLowerCase()] = [];
		aclgroupCache.group[username.toLowerCase()].push(group);
		return res.redirect('/aclgroup?group=' + encodeURIComponent(group));
	} while(0);
	
	res.send(await render(req, 'ACLGroup', content, {
	}, '', error, 'aclgroup'));
});

}
