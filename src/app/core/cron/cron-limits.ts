/**
 * Limites de datas suportados pela simulação. O croner interrompe a busca de padrões sem
 * campo de ano no ano 3000; o limite inferior evita datas anteriores à época Unix.
 * Ambos são calculados no fuso local, o mesmo utilizado pela simulação.
 *
 * Arquivo sem dependências: pode ser importado pela interface sem carregar a biblioteca CRON.
 */
export const MIN_SUPPORTED_DATE_MS = new Date(1970, 0, 1, 0, 0, 0, 0).getTime();
export const MAX_SUPPORTED_DATE_MS = new Date(2999, 11, 31, 23, 59, 59, 999).getTime();
