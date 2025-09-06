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