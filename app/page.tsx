import { getChatGPTUser,chatGPTSignInPath } from './chatgpt-auth';
import Dashboard from './dashboard';
import { Check,LockKeyhole,ShieldCheck,UserCog } from 'lucide-react';
export const dynamic='force-dynamic';
export default async function Home(){
 const user=await getChatGPTUser();
 if(user)return <Dashboard/>;
 return <main className="login-page"><section className="login-card"><div className="login-brand"><span className="brand-mark"><Check/></span>Avança</div><p className="eyebrow">ACESSO INDIVIDUAL</p><h1>Entre no seu espaço</h1><p className="login-description">Cada pessoa usa sua própria conta. O perfil cadastrado define exatamente o que ela pode acessar.</p><a className="signin-link" href={chatGPTSignInPath('/')} target="_top"><LockKeyhole size={18}/> Entrar com ChatGPT</a><div className="login-security"><ShieldCheck/><div><strong>Acesso protegido</strong><span>Gestores veem a equipe, os gráficos e o ranking. Funcionários veem somente o próprio trabalho.</span></div></div><p className="login-help">Seu e-mail precisa ser cadastrado pelo administrador antes do primeiro acesso.</p></section><aside className="login-side"><div><span className="side-kicker">GESTÃO DE DESEMPENHO</span><h2>Uma conta para cada pessoa.<br/>A visão certa para cada função.</h2><div className="login-feature"><UserCog/><span><strong>Perfis definidos por você</strong><small>Cadastre gestores e funcionários quando precisar.</small></span></div></div></aside></main>;
}
