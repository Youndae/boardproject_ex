# BoardProject REST API Express 버전

## 목적
Express 프로젝트 구조와 이해도 학습 목적   
학습시에 SSR로만 학습했기 때문에 REST API 구조의 경험 목적

## 설치 패키지
- express 5.1.0
- dotenv-flow 4.1.0
- cross-env 10.0.0
- morgan 1.10.1
- multer 2.0.2
- cookie-parser 1.4.7
- sequelize 6.37.7
- sequelize-cli 6.6.3
- mysql2 3.14.4
- passport 0.7.0
- passport-local 1.0.0
- passport-kakao 1.0.1
- passport-google-oauth20 2.0.0-> passport-google 대신 많이 사용. deprecated 이슈 방지를 위해.
- passport-naver 1.0.6
- bcrypt 6.0.0
- jsonwebtoken 9.0.2
- pm2 6.0.8
- cors 2.8.5
- winston 3.17.0
- winston-daily-rotate-file 5.0.0
- zod 4.1.5
- helmet 8.1.0
- dayjs 1.11.18
- sharp 0.34.3
- fs-extra 11.3.1
- module-alias 2.2.3
- uuid 11.1.0
- redis 5.8.2
- dev
  - jest 29.7.0
  - nodemon 3.1.10
  - supertest 7.1.4


---

# History

## 25/09/02
> 프로젝트 시작   
>> 기본 디렉토리 구조 생성   
>> model 정의   
>> loggerConfig.js 정의   
>> docker-compose.yml 작성   
>> env 작성   
>> .gitignore 작성

<br/>

## 25/09/03
> tokenMiddleware, memberRepository 일부, customError, responseStatus, tokenConstants, redisConfig, jwtConfig, validatorConfig, jwtTokenProvider, cookieUtils 작성   
> pm2 설정으로 ecosystem.config.js 작성   
> redis 패키지 추가

<br/>

## 25/09/04
> passport - local, naver, kakao, googleStrategy 처리. passport/index.js 수정 oAuth strategy에 따라 MemberRepository, AuthRepository 생성 및 처리.   
> oAuth Strategy 관련 로직을 oAuthService로 분리.   
> validatorConfig를 버전에 맞는 코드로 수정.   
> memberRouter, memberController 생성. 작업 중.

<br/>

## 25/09/06
> memberRouter, memberController, memberService, resize, uplaodMiddleware, fileUtils 추가 및 구현.

<br/>

## 25/09/07 ~ 25/09/08
> memberRepository, authRepository, memberServiceUnit 테스트 코드 작성.   
> jest ESM 호환성을 위해 babel-jest, @babel/core, @babel/preset-env 패키지 설치.   
> jest.config.cjs, babel.config.cjs 추가.   
> 문제 발생 및 해결
>> ESM 환경으로 인해 mocking 처리에서 문제가 발생.   
>> unstable로 처리하는 것만으로 문제 해결이 불가능한 것을 체크.   
>> 찾아보니 babel-jest를 통해 ESM을 인식하게 해야 한다는 점을 알게 됨.   
>> 그래서 각 config를 cjs로 변경하고 내용을 수정.   
>> unstable의 경우 다른 테스트에도 영향을 끼칠 수 있다는 점 때문에 완전한 독립성을 위해 resetMocks, restoreMocks를 true로 설정해 자동 초기화 하도록 처리.   
>> clearMocks도 true로 설정.   
>> 이번 문제 해결을 통해 Express + Javascript 환경의 ESM은 jest로 인한 제약이 있다는 점을 알게 됨.   
>> jest 작성에 있어서 unstable을 사용하는 것도 초기화 문제로 인해 다른 테스트 파일에 영향을 줄 수 있기 때문에 초기화를 항상 고려해야 한다는 점도.   
> 학습 내역
>> jest.spyOn으로 mocking 처리가 가능하지만 스프링의 Mockito 처럼 완전한 mocking이 아니기 때문에 spyOn()으로만 처리한다면 mocking이 아니라 실제 함수가 실행된다는 특징이 있다.   
>> 그렇기 때문에 void의 경우 mockReturnValue(() => {})를 통해 빈 객체라도 반환하도록 설정해줄 필요가 있음.   
>> unstable_mockModule로 Mocking하는 경우 jest.fn()으로 처리하게 되면 따로 반환값이 정의되지 않는다.   
>> 하지만 spyOn과 다르게 완벽한 mocking으로 처리.   
>> 그렇기 때문에 반환값이 존재하지 않는다면 따로 테스트 케이스에서 반환값을 정의해야할 필요가 없다.   
>> 반환값을 정의해야 할 때는 mockReturnValue()를 통해 spyOn과 동일한 구조로 정의해주면 된다.
> 오늘부터 feature, test, doc으로 나눠서 branch 별로 관리하고 각각 feature(기능, 소스코드), test(테스트 코드), doc(README 같은 문서)를 의미. merge 경험이 너무 없어서 추가하기 위함.   
> 데스크탑과 맥북 환경을 번갈아가며 편하게 사용하기 위해 cross-env script를 추가.   
>> 현재 S3를 사용하지 않기 때문에 파일의 경우 로컬 저장. 이 경로에 대한 설정은 env에서 관리하기 때문에 데스크탑과 맥북에서 env를 따로 관리하는 방법으로 처리.   
>> 어차피 env는 ignore된 상태이기 때문에 직접 관리하는게 맞다고 판단.

<br/>

## 25/09/09
> memberService 통합 테스트 작성. 전체 통과 확인.
> memberRoutes 통합 테스트 중.   
> 기본적으로 Cookie를 어떻게 담아야 할지, multer를 어떻게 처리할지 테스트 및 방법 실습.   
> resize, delete 까지 그냥 수행되는 방향으로 둔 상태지만 resize, delete의 경우 mocking을 통해 호출 여부를 검증할 수 있도록 수정 예정.

<br/>

## 25/09/10
> memberRoutes resize, deletefile mocking 처리 완료 및 테스트 수행.   
> deletefile의 경우 fileUtils에서 getResizeProfileName과 같이 있었는데 getResizeProfileName은 mocking되지 않은 상태로 정상 저장을 검증하기 위해 fileNameUtils로 분리.   
> fileNameUtils에서 ext, baseName을 구하는 유틸을 분리. resize에서도 이 유틸을 통해 ext, basename을 받도록 수정.   

<br/>

## 25/09/11
> memberRoutes 테스트 작성 중.   
> 문제 발생
>> 다른 테스트가 정상적으로 처리되기랠 몰랐는데 tokenMiddleware가 정상적으로 동작하지 않는다는 것을 확인.   
>> 문제점은 cookie에서 이미 값을 가져왔는데 그걸 다시 .value로 가져오게 되면서 null로 처리되어 Cookie가 정상이더라도 검증을 수행하지 않는 것이 문제.   
>> 해당 부분을 cookieUtils에서 가져온 그대로 사용하는 것으로 수정.   
>> 검증 함수의 경우 async로 선언되어있는데 tokenMiddleware에서는 그냥 호출하는 바람에 반환값이 Promise 객체인 것이 두 번째 문제.   
>> 해당 부분들을 체크하고 await 을 붙여주는 것으로 문제 해결.   
> memberRoutes 테스트 코드 작성 및 테스트 완료.   
> oAuth2 구현 및 브라우저 테스트 완료.   
> jwtTokenProvider CustomError 상태 코드 및 응답 메시지 하드코딩 되어있던거 ResponseStatus, ResopnseStatusCode로 개선.   
> 문제 발생   
>> 테스트에서는 문제가 없었으나 dev 로 실행하니 module-alias 인식 문제가 발생.   
>> 원인을 찾아보니 module-alias는 CJS에서 정상처리되며 ESM에서는 정상처리되지 않는다는 것을 알게 됨.   
>> 그러나 테스트 코드에서는 잘 됐기 때문에 그 이유를 찾아보니 jest에서는 jest.config.cjs의 moduleNameMapper를 참조하기 때문.   
>> NODE_OPTIONS + --experimental-specifier-resolution=node 또는 module-alias/register를 직접 import 하는 방법도 있지만 ESM 전용 path alias를 사용하는 것으로 분제를 해결.   
>> node 14+ 부터 package.json에 imports 필드를 지원했으며 이걸 사용하면 ESM 환경에서 alias가 native로 동작.

<br/>

## 25/09/12
> board Routes, controller, service, repository 작성 및 테스트 전체 작성, 체크 완료.   
> Board 모델에서 누락되었던 boardIndent 필드 추가.

<br/>

## 25/09/13
> ImageBoard Routes, controller, service, repository 작성 및 테스트 전체 작성, 체크 완료.   

<br/>

## 25/09/14
> Comment Routes, controller, service, repository 작성 및 테스트 전체 작성, 체크 완료.