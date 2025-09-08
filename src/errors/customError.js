class CustomError extends Error {
	constructor({MESSAGE, CODE}) {
		super(MESSAGE);
		this.status = CODE;
	}
}

export default CustomError;