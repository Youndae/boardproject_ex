export const getOffset = (pageNum, amount) => {
	return (pageNum - 1) * amount;
}

export const toPage = (result, page, amount) => {
	const totalElements = Array.isArray(result.count)
	? result.count.length
		: result.count;

	return {
		items: result.rows,
		totalPages: Math.ceil(totalElements / amount),
		isEmpty: totalElements === 0,
		currentPage: page
	}
}