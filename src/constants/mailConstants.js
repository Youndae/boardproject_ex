export const MailConstants = Object.freeze({
    NAVER: 'naver',
    DAUM: "daum",
    GMAIL: 'gmail',
    NONE: 'none'
});

const VALID_SUFFIXES = new Set(Object.values(MailConstants));

;export const findSuffixType = (suffix) => {
    return VALID_SUFFIXES.has(suffix) ? suffix : MailConstants.NONE;
}