import { getChatGPTUser,chatGPTSignInPath } from './chatgpt-auth';
import Dashboard from './dashboard';
export const dynamic='force-dynamic';
export default async function Home(){
 const user=await getChatGPTUser();
 if(user)return <Dashboard/>;
 return <main className="login-page"><section className="login-card"><div className="login-brand">Avança</div><h1>Entre na sua conta</h1><p>Use sua conta ChatGPT. O administrador define seu acesso como gestor ou funcionário.</p><a className="signin-link" href={chatGPTSignInPath('/')} target="_top">Entrar com ChatGPT</a><p>Seu e-mail precisa estar cadastrado pelo administrador.</p></section><aside className="login-side"><h2>Suas atividades.<br/>Seu progresso.<br/>Sua equipe.</h2></aside></main>;
}
