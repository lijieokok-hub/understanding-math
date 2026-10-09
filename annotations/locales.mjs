const zh={
 locale:'zh',add:'前往原站反馈',selectedText:'所选正文',title:'反馈位置',label:'你的疑问、发现的错误，或修改想法',
 privacy:'文章、章节、版本和引用会自动记录。留言先交作者核对，审核后可公开展示。请勿填写个人隐私。',
 offlineEditor:'当前离线页面未连接建议服务，不会提交或公开。编辑内容仅暂留本页，关闭页面会丢失。',
 close:'关闭',save:'保存建议',waiting:'正在确认服务器保存结果，请稍候。',empty:'请写下你的疑问或建议。',saving:'正在保存，尚未公开…',
 saved:'建议已保存到服务器，仅作者可见，等待审核。',retained:'你的文字仍保留在这里。',
 discussion:'讨论与纠错',offlineDiscussion:'当前离线页面未连接建议服务。这里不会把本地草稿显示为共享讨论。',
 loading:'正在读取已审核讨论…',noItems:'暂时没有已公开的批注。',recentLimit:'当前显示最近 100 条已公开批注。',
 loadError:'暂时无法读取讨论：',unknownState:'状态未知',viewPassage:'查看正文位置',authorReply:'作者回复：',revision:'关联修订：',viewRevision:'查看修订',
 location:a=>`${a.sectionTitle} · ${a.lang} · 版本 ${a.version}`,
 more:'加载更早的公开讨论',states:{pending:'待核实',confirmed:'已确认',resolved:'已处理',answered:'已答复',revised:'已修订',anchored:'原文位置',reanchored:'已唯一匹配到当前版本',ambiguous:'位置有歧义',orphaned:'原位置已失效'},
 reasons:{SECTION_MISSING:'原章节已移除',INCOMPATIBLE_ANCHOR:'章节已移除或定位格式不兼容',EMPTY_QUOTE:'原文为空',QUOTE_CHANGED:'原文已修改，需作者人工关联修订',MULTIPLE_MATCHES:'有多个可能位置，尚未重新定位'},
 errors:{ROOT_REQUIRED:'需要正文与讨论容器。',META_REQUIRED:'正文缺少文档、版本或语言信息。',MISSING_LATEX:'公式缺少 LaTeX 源码，暂不能可靠定位。',SELECTION_TOO_LONG:'所选段落太长，请缩小到 4000 字符以内。',BAD_RESPONSE:'服务器未确认保存；请保留原内容。',BAD_LIST:'讨论数据格式不正确。',UNSAFE_API_URL:'批注接口必须同源，且不含查询或跳转参数。',TIMEOUT:'服务器未在 15 秒内确认结果；重试会使用同一提交编号，避免重复。',NETWORK_ERROR:'服务暂不可用，请稍后重试。'}
};
const en={
 locale:'en',add:'Feedback on original site',selectedText:'Selected passage',title:'Feedback location',label:'Your question, correction, or suggestion',
 privacy:'Just write your note. The article, section, version, and quotation are recorded automatically. Your submission is private to the author until approved for publication. Please avoid sensitive personal information.',
 offlineEditor:'This offline page is not connected to the suggestion service. Nothing will be submitted or published. Your draft stays on this page only and will be lost when you leave.',
 close:'Close',save:'Save suggestion',waiting:'Waiting for the server to confirm your submission. Please wait.',empty:'Please write your question or suggestion.',saving:'Saving privately…',
 saved:'Your suggestion was saved on the server. It is private to the author and awaiting review.',retained:'Your text is still here.',
 discussion:'Discussion and corrections',offlineDiscussion:'This offline page is not connected to the suggestion service. Local drafts are not shared discussions.',
 loading:'Loading approved discussions…',noItems:'There are no published annotations yet.',recentLimit:'Showing the 100 most recent published annotations.',
 loadError:'Unable to load discussions: ',unknownState:'Unknown status',viewPassage:'View passage',authorReply:'Author reply: ',revision:'Linked revision: ',viewRevision:'View revision',
 location:a=>`${a.sectionTitle} · ${a.lang} · Version ${a.version}`,
 more:'Load earlier public discussions',states:{pending:'Awaiting review',confirmed:'Confirmed',resolved:'Resolved',answered:'Answered',revised:'Article revised',anchored:'Original location',reanchored:'Uniquely matched to this version',ambiguous:'Ambiguous location',orphaned:'Original location unavailable'},
 reasons:{SECTION_MISSING:'The original section has been removed.',INCOMPATIBLE_ANCHOR:'The section is missing or the anchor format is incompatible.',EMPTY_QUOTE:'The original quotation is empty.',QUOTE_CHANGED:'The passage has changed. The author needs to link the revision manually.',MULTIPLE_MATCHES:'More than one location matches. This annotation has not been reattached.'},
 errors:{
  ROOT_REQUIRED:'An article and discussion container are required.',META_REQUIRED:'The article is missing its document, version, or language metadata.',
  MISSING_LATEX:'This formula has no LaTeX source, so its location cannot be recorded reliably.',SELECTION_TOO_LONG:'Please select a shorter passage, no more than 4,000 characters.',
  BAD_RESPONSE:'The server did not confirm that your suggestion was saved. Please keep your text.',BAD_LIST:'The discussion response has an invalid format.',UNSAFE_API_URL:'The annotation endpoint must use the same origin and contain no query or redirect parameters.',
  TIMEOUT:'The server did not confirm the result within 15 seconds. Retrying uses the same submission ID to avoid duplicates.',NETWORK_ERROR:'The service is unavailable. Please try again later.',
  INVALID_INPUT:'Some submission details are invalid. Please check your note and select the passage again.',JSON_REQUIRED:'The server could not accept the submission format.',TOO_LARGE:'The submission is too long. Please shorten it.',
  AUTHOR_AUTH_UNCONFIGURED:'Author sign-in is not connected yet.',SIGN_IN_REQUIRED:'Author sign-in is required.',FORBIDDEN:'You do not have permission to manage this article.',ORIGIN_REJECTED:'The server could not verify the request origin.',
  HOST_REJECTED:'The annotation service address does not match this site.',SUBMISSIONS_UNCONFIGURED:'The annotation service is not connected yet. Nothing was saved on the server.',SUBMISSION_REJECTED:'Submissions are not available right now.',
  UNKNOWN_VERSION:'This article version has not been registered yet. Please refresh or try again later.',ANCHOR_MISMATCH:'The passage does not match the registered article version. Please select it again.',
  CAPACITY_REACHED:'This site has reached its current submission allowance. This suggestion was not saved. Keep the text and try again later.',RATE_LIMITED:'This article has received many suggestions in the last minute. Please try again shortly.',REQUEST_KEY_CONFLICT:'This submission ID was already used for different content. Please reopen the editor.',
  REVIEW_CONFLICT:'This annotation was updated elsewhere. Please refresh before trying again.',NOT_FOUND:'The requested annotation or endpoint was not found.',INTERNAL_ERROR:'The service is unavailable. Keep your text and try again later.'
 }
};
export function getStrings(locale='zh'){return String(locale).toLowerCase().startsWith('en')?en:zh;}
export function errorText(error,strings){
  if(strings.errors[error?.code])return strings.errors[error.code];
  // Never surface untranslated server messages on English pages.
  return strings.locale==='en'?strings.errors.NETWORK_ERROR:(error?.message||strings.errors.NETWORK_ERROR);
}
export function codedError(code,message){const error=new Error(message||code);error.code=code;return error;}
