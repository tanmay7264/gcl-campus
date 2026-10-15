import Home from './app/page';
import Privacy from './app/privacy/page';
import ProjectPage from './ProjectPage';
import {SiteHeader} from './components/SiteHeader';
import {SiteFooter} from './components/SiteFooter';
import {projects} from './lib/projects';
export const base='/weschool-gcl/world/';
export const routes=['','privacy/',...projects.map(p=>'projects/'+p.slug+'/')];
export function title(route:string){const project=projects.find(p=>route==='projects/'+p.slug+'/');return project?project.title+' · GCL World':route==='privacy/'?'Privacy · GCL World':'GCL World · WeSchool'}
export function App({route}:{route:string}){const slug=route.split('/')[1];return <><a className="skip-link" href="#main">Skip to content</a><SiteHeader/>{route===''?<Home/>:route==='privacy/'?<Privacy/>:route.startsWith('projects/')?<ProjectPage slug={slug}/>:<main id="main" className="page-container"><h1>Page not found.</h1><a href={base}>Return to GCL World</a></main>}<SiteFooter/></>}
