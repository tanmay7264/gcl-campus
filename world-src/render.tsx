import {renderToString} from 'react-dom/server';
import {App} from './App';
export {routes,title,base} from './App';
export function render(route:string){return renderToString(<App route={route}/>)}
