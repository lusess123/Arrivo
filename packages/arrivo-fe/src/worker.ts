const PRIMARY_HOST = 'arrivo.zyking.xyz';
const LEGACY_HOST = 'app-arrivo.zyking.xyz';

interface Env {
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
}

export default {
  fetch(request: Request, env: Env) {
    const url = new URL(request.url);

    if (url.hostname === LEGACY_HOST) {
      url.hostname = PRIMARY_HOST;
      return Response.redirect(url.toString(), 308);
    }

    return env.ASSETS.fetch(request);
  },
};
