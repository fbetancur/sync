import{a as g,b as _,s as v}from"./vendor.js";import"clsx";import"./environment.js";let y={};function j(n){}function z(n){y=n}let b=null;function A(n){b=n}function E(n){}function k(n){const a=g(n),t=(l,{context:s}={})=>{const e=_(n,{props:l,context:s}),r=Object.defineProperties({},{css:{value:{code:"",map:null}},head:{get:()=>e.head},html:{get:()=>e.body},then:{value:(i,p)=>{{const c=i({css:r.css,head:r.head,html:r.html});return Promise.resolve(c)}}}});return r};return a.render=t,a}function w(n,a){n.component(t=>{let{stores:l,page:s,constructors:e,components:r=[],form:i,data_0:p=null,data_1:c=null,data_2:u=null}=a;v("__svelte__",l),l.page.set(s);const f=e[2];if(e[1]){t.push("<!--[-->");const m=e[0];t.push("<!---->"),m(t,{data:p,form:i,params:s.params,children:o=>{if(e[2]){o.push("<!--[-->");const d=e[1];o.push("<!---->"),d(o,{data:c,form:i,params:s.params,children:h=>{h.push("<!---->"),f(h,{data:u,form:i,params:s.params}),h.push("<!---->")},$$slots:{default:!0}}),o.push("<!---->")}else{o.push("<!--[!-->");const d=e[1];o.push("<!---->"),d(o,{data:c,form:i,params:s.params}),o.push("<!---->")}o.push("<!--]-->")},$$slots:{default:!0}}),t.push("<!---->")}else{t.push("<!--[!-->");const m=e[0];t.push("<!---->"),m(t,{data:p,form:i,params:s.params}),t.push("<!---->")}t.push("<!--]--> "),t.push("<!--[!-->"),t.push("<!--]-->")})}const x=k(w),M={app_template_contains_nonce:!1,async:!1,csp:{mode:"auto",directives:{"upgrade-insecure-requests":!1,"block-all-mixed-content":!1},reportOnly:{"upgrade-insecure-requests":!1,"block-all-mixed-content":!1}},csrf_check_origin:!0,csrf_trusted_origins:[],embedded:!1,env_public_prefix:"PUBLIC_",env_private_prefix:"",hash_routing:!1,hooks:null,preload_strategy:"modulepreload",root:x,service_worker:!1,service_worker_options:null,templates:{app:({head:n,body:a,assets:t,nonce:l,env:s})=>`<!doctype html>\r
<html lang="es" data-theme="light">\r
	<head>\r
		<meta charset="utf-8" />\r
		<link rel="icon" href="`+t+`/favicon.ico" />\r
		<meta name="viewport" content="width=device-width, initial-scale=1" />\r
		\r
		<!-- PWA Meta Tags -->\r
		<meta name="theme-color" content="#1e40af" />\r
		<meta name="apple-mobile-web-app-capable" content="yes" />\r
		<meta name="apple-mobile-web-app-status-bar-style" content="default" />\r
		<meta name="apple-mobile-web-app-title" content="CrediSync" />\r
		\r
		<!-- PWA Manifest -->\r
		<link rel="manifest" href="`+t+`/manifest.webmanifest" />\r
		\r
		<!-- PWA Icons -->\r
		<link rel="apple-touch-icon" href="`+t+`/icon-192.png" />\r
		<link rel="icon" type="image/svg+xml" href="`+t+`/icon.svg" />\r
		\r
		<title>CrediSync - Gestión de Microcréditos</title>\r
		<meta name="description" content="Progressive Web App para gestión de microcréditos y cobranza en campo" />\r
		\r
		`+n+`\r
	</head>\r
	<body data-sveltekit-preload-data="hover" class="bg-gray-50">\r
		<div style="display: contents">`+a+`</div>\r
	</body>\r
</html>`,error:({status:n,message:a})=>`<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<title>`+a+`</title>

		<style>
			body {
				--bg: white;
				--fg: #222;
				--divider: #ccc;
				background: var(--bg);
				color: var(--fg);
				font-family:
					system-ui,
					-apple-system,
					BlinkMacSystemFont,
					'Segoe UI',
					Roboto,
					Oxygen,
					Ubuntu,
					Cantarell,
					'Open Sans',
					'Helvetica Neue',
					sans-serif;
				display: flex;
				align-items: center;
				justify-content: center;
				height: 100vh;
				margin: 0;
			}

			.error {
				display: flex;
				align-items: center;
				max-width: 32rem;
				margin: 0 1rem;
			}

			.status {
				font-weight: 200;
				font-size: 3rem;
				line-height: 1;
				position: relative;
				top: -0.05rem;
			}

			.message {
				border-left: 1px solid var(--divider);
				padding: 0 0 0 1rem;
				margin: 0 0 0 1rem;
				min-height: 2.5rem;
				display: flex;
				align-items: center;
			}

			.message h1 {
				font-weight: 400;
				font-size: 1em;
				margin: 0;
			}

			@media (prefers-color-scheme: dark) {
				body {
					--bg: #222;
					--fg: #ddd;
					--divider: #666;
				}
			}
		</style>
	</head>
	<body>
		<div class="error">
			<span class="status">`+n+`</span>
			<div class="message">
				<h1>`+a+`</h1>
			</div>
		</div>
	</body>
</html>
`},version_hash:"yz4cj4"};async function O(){return{handle:void 0,handleFetch:void 0,handleError:void 0,handleValidationError:void 0,init:void 0,reroute:void 0,transport:void 0}}export{z as a,A as b,E as c,O as g,M as o,y as p,b as r,j as s};
