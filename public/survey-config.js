export const surveyVersion = 2;
export const questions = [
  {id:'frequency', title:'Как часто вы покупаете новую одежду?', options:['Несколько раз в месяц','Раз в месяц','Раз в несколько месяцев','Несколько раз в год','Только при необходимости']},
  {id:'priorities', title:'Что для вас самое важное при покупке одежды?', multiple:true, options:['Качество и долговечность','Цена','Внешний вид и стиль','Известность бренда','Комфорт и удобство']},
  {id:'priceQuality', title:'Считаете ли вы, что дорогая одежда всегда качественнее дешёвой?', options:['Да, высокая цена обычно означает хорошее качество','Нет, цена не всегда зависит от качества','Иногда это так, но не всегда','Затрудняюсь ответить']},
  {id:'qualityDecline', title:'Замечали ли вы, что качество современной одежды стало хуже?', options:['Да, очень заметно','Иногда замечаю','Нет, качество не изменилось','Не обращаю внимания']},
  {id:'wear', title:'Случалось ли вам покупать одежду, которая быстро теряла свой вид или рвалась?', options:['Да, часто','Иногда','Очень редко','Никогда']},
  {id:'brand', title:'Готовы ли вы переплачивать за известный бренд?', options:['Да, мне важен бренд','Только если качество действительно хорошее','Нет, для меня важнее цена и качество','Затрудняюсь ответить']},
  {id:'vintage', title:'Покупали ли вы когда-нибудь винтажную одежду или вещи из секонд-хенда?', options:['Да, покупаю регулярно','Да, пробовал(а) несколько раз','Нет, но хотел(а) бы попробовать','Нет, мне это неинтересно']},
  {id:'vintageReasons', title:'Что могло бы заставить вас покупать винтажную одежду?', options:['Более низкая цена','Лучшее качество материалов','Уникальный стиль и редкие вещи','Забота об окружающей среде','Ничего, я не заинтересован(а) в винтаже']},
  {id:'inspection', title:'Проверяете ли вы состав ткани, швы и качество материалов перед покупкой?', options:['Да, всегда','Иногда','Только если вещь дорогая','Нет, никогда']},
  {id:'checklist', title:'Хотели бы вы получить простой чек-лист, который поможет определить качество одежды за 2 минуты?', options:['Да, это было бы полезно','Возможно, хотел(а) бы попробовать','Нет, мне это неинтересно']}
];
// Aggregate counts transcribed from the supplied Google Forms screenshots.
// No individual questionnaires or relationships between answers were provided.
export const googleResults = {
  total:27,
  counts:{frequency:[0,4,8,5,10],priorities:[11,6,14,3,9],priceQuality:[7,11,4,5],qualityDecline:[6,8,5,8],wear:[1,11,13,2],vintage:[3,8,4,12],vintageReasons:[6,3,6,0,12],inspection:[16,3,6,2],checklist:[10,10,7]},
  brand:{title:questions[5].title,options:['Да, мне важен бренд','Да, если мне нравится вид вещи','Да, но только если качество действительно хорошее','Нет','Затрудняюсь ответить'],counts:[3,9,7,2,6]}
};
export function validAnswers(answers){
  if(!answers || typeof answers!=='object' || Array.isArray(answers))return false;
  return questions.every(q=>{
    const value=answers[q.id];
    if(q.multiple)return Array.isArray(value)&&value.length>0&&value.length<=q.options.length&&new Set(value).size===value.length&&value.every(i=>Number.isInteger(i)&&i>=0&&i<q.options.length);
    return Number.isInteger(value)&&value>=0&&value<q.options.length;
  });
}
export function emptyCounts(){return Object.fromEntries(questions.map(q=>[q.id,Array(q.options.length).fill(0)]));}
export function combineStats(onlineTotal,onlineCounts){
  const counts=emptyCounts();const denominators={};
  for(const q of questions){
    const base=googleResults.counts[q.id];
    counts[q.id]=onlineCounts[q.id].map((n,i)=>n+(base?.[i]||0));
    denominators[q.id]=onlineTotal+(base?googleResults.total:0);
  }
  return {version:surveyVersion,total:googleResults.total+onlineTotal,googleTotal:googleResults.total,onlineTotal,counts,denominators};
}
