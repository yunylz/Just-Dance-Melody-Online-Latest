import logging
import requests
from mitmproxy import http

logger = logging.getLogger(__name__)

def proxy_to_harbour(flow: http.HTTPFlow, target_domain: str) -> None:
    """Proxy request to custom harbour domain synchronously as Wii U requires."""
    method = flow.request.method
    path = flow.request.path

    # Build the target URL - preserve original query format
    target_url = f"http://{target_domain}{path}"
    if flow.request.query:
        query_string = "&".join([f"{k}={v}" for k, v in flow.request.query.items(multi=True)])
        target_url += f"?{query_string}"

    try:
        response = requests.request(
            method=method,
            url=target_url,
            headers=dict(flow.request.headers),
            data=flow.request.content,
            allow_redirects=False,
            timeout=30
        )

        flow.response = http.Response.make(
            status_code=response.status_code,
            content=response.content,
            headers=dict(response.headers)
        )

        logger.debug(f"Proxied {method} {target_domain}{path} -> {response.status_code}")

    except requests.RequestException as e:
        logger.error(f"Error proxying to {target_domain}: {e}")
        flow.response = http.Response.make(
            status_code=500,
            content=f"Proxy error: {str(e)}",
            headers={"Content-Type": "text/plain"}
        )
    except Exception as e:
        logger.error(f"Unexpected error proxying to {target_domain}: {e}")
        flow.response = http.Response.make(
            status_code=500,
            content="Internal proxy error",
            headers={"Content-Type": "text/plain"}
        )
