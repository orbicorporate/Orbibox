// Roda antes de qualquer parte do painel aparecer: no app instalado, abrir o painel
// do zero leva direto para a página do dono, sem o painel piscar por um instante.
// Só vale para a tela inicial do painel (/admin) e uma vez por abertura do app.
export const SCRIPT_ABRIR_ANTES_DO_PAINT = `(function(){try{
if(location.pathname!=="/admin")return;
var st=window.matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
if(!st||sessionStorage.getItem("orbibox_abriu")==="1")return;
var tem=false;for(var i=0;i<localStorage.length;i++){if((localStorage.key(i)||"").indexOf("orbibox-divulgar:")===0){tem=true;break;}}
if(!tem)return;
sessionStorage.setItem("orbibox_abriu","1");
document.documentElement.style.visibility="hidden";
location.replace("/abrir");
}catch(e){}})();`;
