import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';

let server;
let AppRoutes;
let AuthProvider;

before(async () => {
  server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  ({ AppRoutes } = await server.ssrLoadModule('/src/App.jsx'));
  ({ AuthProvider } = await server.ssrLoadModule('/src/auth/AuthContext.jsx'));
});

after(async () => {
  await server?.close();
});

function renderRoute(path) {
  return renderToStaticMarkup(
    React.createElement(MemoryRouter, { initialEntries: [path] },
      React.createElement(AuthProvider, null, React.createElement(AppRoutes))),
  );
}

test('staff vehicle routes stay protected and do not resolve to the public fleet', () => {
  assert.match(renderRoute('/vehicles'), /Loading session/);
  assert.match(renderRoute('/vehicles/vehicle-id'), /Loading session/);
  assert.match(renderRoute('/fleet'), /Our Vehicles/);
  assert.match(renderRoute('/fleet/vehicle-id'), /Loading vehicle/);
});
