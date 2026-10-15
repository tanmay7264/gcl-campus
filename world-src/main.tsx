import {hydrateRoot} from 'react-dom/client';
import {App,base} from './App';
import './style.css';
const route=window.location.pathname.slice(base.length).replace(/\/?$/,'/');
hydrateRoot(document.getElementById('root')!,<App route={route==='/'?'':route}/>);
