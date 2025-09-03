import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const logDir = join(__dirname, 'logs/pm2');

if(!fs.existsSync(logDir))
    fs.mkdirSync(logDir, { recursive: true });

export default {
	apps: [
		{
			name: 'boardproject_express',
			script: 'src/server.js',
			instances: 1, // 인스턴스 개수
			exec_mode: 'cluster', // cluster 모드로 실행

			// 환경별 설정
			env: {
				NODE_ENV: 'development',
				PORT: 8081,
				DEBUG: 'app:*',
				LOG_LEVEL: 'debug',
				watch: true, // 파일 변경 감지 시 재시작 (개발시에만 true)
			},
			env_production: {
				NODE_ENV: 'production',
				PORT: 8081,
				watch: false,
			},
			env_test: {
				NODE_ENV: 'test',
				PORT: 8081,
				watch: false,
			},

			// 프로세스 관리 설정
			autorestart: true, // 자동 재시작 활성화
			
			max_memory_restart: '1G', // 메모리 사용량이 1GB 초과 시 재시작

			// 로그 로테이션
			log_rotate_interval: '0 0 * * *', // 매일 0시 0분에 로그 로테이션

			// 매트릭 수집
			merge_logs: true, // 클러스터 모드에서 로그 병합

			// 로그 설정
			log_file: join(logDir, 'combined.log'),
			out_file: join(logDir, 'out.log'),
			error_file: join(logDir, 'error.log'),
			log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

			// 재시작 정책
			min_uptime: '10s', // 최소 10초 이상 실행되어야 정상으로 간주
			max_restarts: 10, // 최대 10번 재시작
			restart_delay: 4000, // 재시작 간격 4초

			// 크래시 처리
			kill_timeout: 5000, // 프로세스 종료 대기 시간 5초
			listen_timeout: 5000, // 프로세스 시작 대기 시간 5초

			// Health Check
			health_check_grace_period: 3000, // Health Check 시작 전 대기 시간 3초

			//추가 옵션
			source_map_support: true, // source map 지원
			node_args: '--max-old-space-size=1024' // Node.js 메모리 제한
		}
	],
}