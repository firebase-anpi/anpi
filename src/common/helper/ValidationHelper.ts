/**
 * Validation Rule: 必須判定
 *
 * @param {string} inputText
 * @returns {boolean}
 */
export const inputRequired = (inputText: string) =>
  !!inputText || '入力必須です';

/**
 * Validation Rule: Emailの有効判定
 * あくまで簡易的なものであり、実際の有効判定はメール送信による検証によって行う
 *
 * @param {string} email
 * @returns {boolean}
 */
export const validEmail = (val: string) =>
  !!val.match('^(.+)@(.+)$') || 'メールアドレスの形式が不正です';

/**
 * Validation Rule: 最大文字数制限
 *
 * @param {number} limit
 * @returns {boolean}
 */
export const charactorLimit = (limit: number) => {
  return (val: string) =>
    val.length <= limit || `${limit}文字以内で入力してください`;
};
