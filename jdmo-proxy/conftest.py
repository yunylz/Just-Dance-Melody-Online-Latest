def pytest_addoption(parser):
    parser.addoption("--proxy",        default="http://127.0.0.1:4080", help="Proxy URL")
    parser.addoption("--hub",          default="http://127.0.0.1:8455", help="Hub API URL")
    parser.addoption("--proxy-secret", required=True,                    help="Proxy shared secret (x-proxy-secret)")
    parser.addoption("--username",     required=True,                    help="Valid Hub username")
    parser.addoption("--password",     required=True,                    help="Valid Hub password")


def pytest_configure(config):
    pass


import pytest

@pytest.fixture(scope="session")
def proxy_url(request):
    return request.config.getoption("--proxy")

@pytest.fixture(scope="session")
def hub_url(request):
    return request.config.getoption("--hub")

@pytest.fixture(scope="session")
def proxy_secret(request):
    return request.config.getoption("--proxy-secret")

@pytest.fixture(scope="session")
def valid_creds(request):
    return (
        request.config.getoption("--username"),
        request.config.getoption("--password"),
    )