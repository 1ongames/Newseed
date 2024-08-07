## **참고!**
**이 엔진은 [imitated-seed-2](https://github.com/gdl-blue/imitated-seed-2/)를 바탕으로 여러 기능들을 추가하여 뉴시드위키, ~~우주위키와 베타위키~~(보류중)가 사용하는 중인 엔진으로, CC BY-NC-ND 2.0 KR 라이센스로 변경 없는 상태에서 비영리적인 목적으로 사용이 가능하다고는 나와있지만, 기본적으로 사용은 금지되며, Issue 탭, [베타위키 문의게시판](http://betawiki.xyz/w/베타위키:문의%20게시판) 또는 [뉴시드위키 문의게시판](https://newseed.xyz/w/뉴시드위키:문의%20게시판)에서 이용 요청을 하여 승인을 받아 해당 위키에 한해 New seed 사용 승인 ~~및 서버 지원~~이 가능하니 주의 바란다.**
## 개요
the seed 모방 프로젝트.  
> "엔진 내부 UI는 상관없음." ( https://feedback.theseed.io/posts/280 )   

[openNAMU2](https://github.com/1ongames/openNAMU-2)의 후속이다.

이 엔진이 정상 작동하는 것으로 확인된 Node.js 버전은 8.6.0, 12.16.2, 12.18.1, 16.6.2이다. 만약 혹시나 Windows XP/Vista에서 실행이 필요한 경우 [이것](https://github.com/hlizard/node8-xp/raw/v8.6.0-xp/Release/Release.zip)을 사용할 것.

 관련 서버
 - 뉴시드위키: http://newseed.xyz/ 
 - ~~피드백 사이트: https://piseed.fider.io/~~ - 곧 이전 예정

나무픽스와 거의 호환된다.

Pull Request 시 서버 코드에는 `?.`, `??`, `import` 등의 신문법, 프론트엔드 자바스크립트에는 ES6 이상 문법을 사용하지 말 것.

파서 함수 이름이 마크다운인 이유는 개발 초기에는 마크다운을 사용했기 때문이다.

추가로, 왜 사이트와 같은 대부분의 주소들이 piseed였냐 하면 [어떤 배신자새끼](https://github.com/NOAH01112)가 뉴시드 프로젝트와 파이시드 프로젝트를 합치자 해놓고, 지 좆대로 행동해서 다시 분리되었다

## 이메일 설정법 [Gmail]
- 먼저 "자신사이트주소/admin/config" 에 접속해 `사이트 주소`란에 자신의 사이트주소를 입력한다.
- config.json 파일을 열고 `"disable_email":"true"`를 제거한다.
- `"mailhost":"smtp.gmail.com","email":"인증메일을 보낼 Gmail 주소","passwd":"구글 앱 비밀번호"`를 추가한다.
- [[구글 앱 비밀번호 설정링크]](https://myaccount.google.com/apppasswords)
- 타사메일의 경우 smtp.gmail.com을 타사메일의 smtp주소로 변경해야함.

## 추가 도구
- backlink-reset.js: 역링크 초기화
- undelete-thread.js: 삭제된 토론 복구
- namuwiki-importer.js: 나무위키 데이타베이스 덤프 가져오기

## config.json
- config.json 수정으로 숨겨진 설정을 제어할 수 있다.
  - `disable_email`: (기본값 false) 전자우편 인증을 끈다.
  - `disable_login_history`: (기본값 false) 로그인 내역을 기록하지 않게 한다.
  - `use_external_js`: (기본값 false) theseed.js, jQuery 등을 [theseed.io](https://theseed.io)에서 불러온다.
  - `use_external_css`: (기본값 false) wiki.css 등을 [theseed.io](https://theseed.io)에서 불러온다.
  - `allow_account_deletion`: (기본값 false) 계정 탈퇴를 허용한다.
  - `allow_account_rename`: (기본값 false) 닉네임 변경을 허용한다.
  - `search_host`: (기본값 "127.5.5.5") 검색 서버 호스트 주소
  - `search_port`: (기본값 25005) 검색 서버 포트
  - `search_autostart`: (기본값 false) 같은 디렉토리에 검색 서버 프로그램(search.js)이 있을 경우 위키 서버 시작 시 검색 서버를 같이 시작시킨다.
  - `no_username_format`: (기본값 false) 한글, 공백 등의 특수문자를 사용자 이름으로 쓸 수 있게 하고 길이 제한을 없앤다.
  - `owners`: (기본값 \[\]) /admin/config에 접속할 수 있는 사용자 이름 배열
  - `reserved_usernames`: (기본값 \["namubot"\]) 이 배열 안에 있는 닉네임으로 계정을 만들 수 없다.
  - `theseed_version`: (기본값 "4.12.0") [the seed 판올림 기록](https://namu.wiki/w/the%20seed/%EC%97%85%EB%8D%B0%EC%9D%B4%ED%8A%B8#toc)을 참고하여, 모방할 the seed 엔진의 버전을 지정한다(형식 주의! 4.4(X), "4.4"(X), 4.4.1(X), "4.4.1"(O) 문자열 x.y.z 형식으로). 예를 들어, "4.4.2"로 할 경우, v4.4.3에 추가된 쓰레드 주제/문서 변경 기능을 사용할 수 없고, "4.18.0"으로 할 경우 IPACL과 사용자 차단 기능이 비활성화되고 ACLGroup가 활성화되며 ACL에서 이름공간ACL 실행 action를 사용할 수 있다.
  - `replicate_theseed_license`: (기본값 false) 라이선스 페이지를 더시드 엔진처럼 띄운다. 가급적이면 쓰지 않는 것을 권장한다.
  - `namuwiki_exclusive`: (기본값 false) 나무위키 전용 기능(경고 ACL 그룹, 문서 이전 판 경고 등)을 활성화한다.
  - `enable_captcha`: (기본값 false) 보안문자를 쓰게 한다.
  - `block_ip`: (기본값 []) 접속을 차단할 IP를 지정한다. CIDR는 지원하지 않는다.
  - `protect_owner`: (기본값 false) 소유자 보호 기능을 활성화한다.
  - `disable_multithreading`: (기본값 true) 멀티쓰레딩을 비활성화한다.
  - `custom_namespaces`: (기본값 []) 사용자 지정 이름공간 배열
  - `sessionhttp`: (기본값 false) true로 설정시, https접속시에만 로그인이 유지된다.
  - `mailhost`: (기본값 []) 이메일 호스트 설정.
  - `email`: (기본값 []) 이메일 주소.
  - `passwd`: (기본값 []) 이메일 주소의 비밀번호(gmail의 경우 앱 비밀번호).
  - `disable_file_server`: (기본값 false) 별도 파일 서버 없이도 파일 업로드가 가능하게 한다.
  - `max_file_size`: (기본값 2000000) 최대 파일 크기 (바이트 단위)

## 라이선스
병아리를 커스텀할때 참고하는 것이면 몰라도, 이 엔진을 그대로 가져다가 쓰지는 말길 바란다. 참고할 경우 readme라던가 /routes/license.js 에 관련 내용을 서술해 주길 바란다.
localhost를 통한 개인 위키로 이용하고자 하는 경우에는 issue 탭이나, 뉴시드위키의 문의 게시판 등에 문의를 남겨 허락을 받길 바란다.
## 더 시드와 다른 것들
- 엔진에서 백엔드와 프론트엔드를 모두 처리한다. (오픈나무에서 영향 받음)
- 밀리초 유닉스 시간을 사용한다.
- /notify/thread 라우트가 제대로 되어있지 않다.

