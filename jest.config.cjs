module.exports = {
	testEnvironment: 'node',
	transform: {
		'^.+\\.js$': 'babel-jest',
	},
	moduleFileExtensions: ['js', 'json'],
	moduleDirectories: ['node_modules', 'src'],
	testMatch: ['**/test/**/*.test.js'],
	clearMocks: true,
	resetMocks: true,
	restoreMocks: true,
	moduleNameMapper: {
		'^@config/(.*)$': '<rootDir>/src/config/$1',
		'^@constants/(.*)$': '<rootDir>/src/constants/$1',
		'^@controllers/(.*)$': '<rootDir>/src/controllers/$1',
		'^@errors/(.*)$': '<rootDir>/src/errors/$1',
		'^@logger/(.*)$': '<rootDir>/src/logger/$1',
		'^@middleware/(.*)$': '<rootDir>/src/middleware/$1',
		'^@models/(.*)$': '<rootDir>/src/models/$1',
		'^@passport/(.*)$': '<rootDir>/src/passport/$1',
		'^@repositories/(.*)$': '<rootDir>/src/repositories/$1',
		'^@routes/(.*)$': '<rootDir>/src/routes/$1',
		'^@services/(.*)$': '<rootDir>/src/services/$1',
		'^@utils/(.*)$': '<rootDir>/src/utils/$1',
	}
}