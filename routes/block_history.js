const express = require('express');
const router = express.Router();
const curs = require('./database');  // 데이터베이스 연결 모듈
const { generateTime, toDate, ip_pas, navbtn, ver, html, parses } = require('./helpers');  // 필요한 헬퍼 함수들

router.get('/BlockHistory', async (req, res) => {
    var pa = [];
    var qq = " where '1' = '1' ";
    if (req.query['target'] && req.query['query']) {
        const com = req.query['query'].startsWith('"') && req.query['query'].endsWith('"');
        const query = com ? req.query['query'].replace(/^\"/, '').replace(/\"$/, '') : req.query['query'];
        if (req.query['target'] == 'author') {
            qq = 'where executer ' + (com ? ' = ? ' : "like '%' || ? || '%' ");
            pa = [query];
        } else {
            qq = 'where note ' + (com ? ' = ? ' : "like '%' || ? || '%' ") + ' or target ' + (com ? ' = ? ' : "like '%' || ? || '%' ");
            pa = [query, query];
        }
    }
    var total = (await curs.execute("select count(logid) from block_history"))[0]['count(logid)'];

    const from = req.query['from'];
    const until = req.query['until'];
    var data;
    if (from) {
        data = await curs.execute("select logid, date, type, aclgroup, id, duration, note, executer, target, ismember from block_history " +
            qq + " and (cast(logid as integer) <= ? AND cast(logid as integer) > ?) order by cast(date as integer) desc limit 100",
            pa.concat([Number(from), Number(from) - 100]));
    } else if (until) {
        data = await curs.execute("select logid, date, type, aclgroup, id, duration, note, executer, target, ismember from block_history " +
            qq + " and (cast(logid as integer) >= ? AND cast(logid as integer) < ?) order by cast(date as integer) desc limit 100",
            pa.concat([Number(until), Number(until) + 100]));
    } else {
        data = await curs.execute("select logid, date, type, aclgroup, id, duration, note, executer, target, ismember from block_history " +
            qq + " order by cast(date as integer) desc limit 100",
            pa);
    }

    const result = data.map(item => ({
        date: generateTime(toDate(item.date), timeFormat),
        executer: ip_pas(item.executer, item.ismember, 0, 1),
        target: item.target,
        action: item.type === 'aclgroup_add' ? `<b>${item.aclgroup}</b> ACL 그룹에 추가` :
                item.type === 'aclgroup_remove' ? `<b>${item.aclgroup}</b> ACL 그룹에서 제거` :
                item.type === 'ipacl_add' ? `IP 주소 차단` :
                item.type === 'ipacl_remove' ? `IP 주소 차단 해제` :
                item.type === 'login_history' ? `사용자 로그인 기록 조회` :
                item.type === 'suspend_account' && item.duration != '-1' ? `사용자 차단` :
                item.type === 'suspend_account' && item.duration == '-1' ? `사용자 차단 해제` :
                item.type === 'grant' ? `사용자 권한 설정` : '',
        note: item.note,
        duration: (item.type === 'aclgroup_add' || item.type === 'ipacl_add' || (item.type === 'suspend_account' && item.duration != '-1')) ?
                (ver('4.0.20') ? `(${item.duration == '0' ? '영구적으로' : `${parses(item.duration)} 동안`})` : `(${item.duration} 동안)`) : ''
    }));

    res.send(`
        <!DOCTYPE html>
        <html lang="ko">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>차단 내역</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 20px;
                    background-color: #f9f9f9;
                }

                .container {
                    max-width: 800px;
                    margin: 0 auto;
                    background: #fff;
                    padding: 20px;
                    border-radius: 8px;
                    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                }

                h1 {
                    margin-top: 0;
                    font-size: 24px;
                }

                form {
                    display: flex;
                    gap: 10px;
                    margin-bottom: 20px;
                }

                form select, form input, form button {
                    padding: 10px;
                    font-size: 16px;
                }

                form button {
                    cursor: pointer;
                }

                .wiki-list {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                }

                .wiki-list li {
                    padding: 10px;
                    border-bottom: 1px solid #ddd;
                }

                .wiki-list li:last-child {
                    border-bottom: none;
                }

                .pagination {
                    display: flex;
                    justify-content: space-between;
                    margin-top: 20px;
                }

                .pagination button {
                    padding: 10px 20px;
                    font-size: 16px;
                    cursor: pointer;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>차단 내역</h1>
                <form id="search-form">
                    <select name="target">
                        <option value="text"${req.query['target'] == 'text' ? ' selected' : ''}>내용</option>
                        <option value="author"${req.query['target'] == 'author' ? ' selected' : ''}>실행자</option>
                    </select>
                    <input name="query" placeholder="검색" type="text" value="${html.escape(req.query['query']) || ''}">
                    <button type="submit">검색</button>
                    <button type="button" id="reset-button">초기화</button>
                </form>
                <ul id="block-history" class="wiki-list">
                    ${result.map(item => `
                        <li>
                            <span>${item.date}</span> ${item.executer} 사용자가 ${item.target} <i>(${item.action} - ${item.note})</i>
                        </li>
                    `).join('')}
                </ul>
                <div class="pagination">
                    <button id="prev-button" ${data.length < 100 ? 'disabled' : ''}>이전</button>
                    <button id="next-button" ${data.length < 100 ? 'disabled' : ''}>다음</button>
                </div>
            </div>
            <script>
                document.addEventListener("DOMContentLoaded", function() {
                    const searchForm = document.getElementById('search-form');
                    const resetButton = document.getElementById('reset-button');
                    const prevButton = document.getElementById('prev-button');
                    const nextButton = document.getElementById('next-button');

                    searchForm.addEventListener('submit', function(event) {
                        event.preventDefault();
                        const formData = new FormData(searchForm);
                        const queryParams = new URLSearchParams(formData).toString();
                        window.location.search = queryParams;
                    });

                    resetButton.addEventListener('click', function() {
                        searchForm.reset();
                        window.location.search = '';
                    });

                    prevButton.addEventListener('click', function() {
                        const urlParams = new URLSearchParams(window.location.search);
                        const from = urlParams.get('from') || 0;
                        urlParams.set('from', Number(from) - 100);
                        window.location.search = urlParams.toString();
                    });

                    nextButton.addEventListener('click', function() {
                        const urlParams = new URLSearchParams(window.location.search);
                        const from = urlParams.get('from') || 0;
                        urlParams.set('from', Number(from) + 100);
                        window.location.search = urlParams.toString();
                    });
                });
            </script>
        </body>
        </html>
    `);
});

module.exports = router;
