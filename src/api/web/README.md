# Point Network Web App Utility
===============================

The **Point Network Web App Utility** is rendered using the [Fastify-NextJS](https://github.com/fastify/fastify-nextjs) plugin. Essentially this plugin enables server side rendering of React JS components via a Fastify Node JS API.

When you start up a node, for example Node 1, then the Point Network Web Utility will be available via [http://localhost:2468/](http://localhost:2468/).

## Folder Structure

The application is structured as follows:

The root of the Next JS web application lives in the **api/web**  folder. Its configured to live in this folder via the server registration in the [api/index.js](./api/index.js) file line: `server.register(require('fastify-nextjs'), { dev: true, dir: './api/web' })`.

Everything that follows is under the folder **api/web**:

* **components** - Specific React Components and their associated CSS modules.
* **pages** - Pages that are part of the application such as index, reporting, search etc are here.
* **public/images** - Static images such as logos, identicons, avatars, screen captures and so on.
* **styles** - CSS files can be placed here.

## Routes

Configure routes for the Next JS application in the `api/index.js` file. It will look for the file in the **pages** folder as specified above.

For example the route `server.next('/')` is the *default route* that will load the file `pages/index.js` as the root route. If you had a new js file called `pages/example.js` then the route for this page can be added using `server.next('/example')`.

The minimum page component for example would be:

```
export default () => (
  <b>EXAMPLE!</b>
)
```
