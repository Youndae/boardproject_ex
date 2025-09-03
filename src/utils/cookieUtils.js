export const getCookie = (req, cookieName) => {
	return req.cookies[cookieName] || null;
}