
from django.urls import re_path

from . import consumers

# This contain regex (regular expressions.) ENSURE THIS IS SECURE AGAINST ATTACKS!!! regex is an opening. Oh shit...
websocket_urlpatterns = [
    re_path(r'^ws/stableClient/(?P<channelName>[^/]+)$', consumers.stableClient.as_asgi()),
    re_path(r'^ws/stableCompute/(?P<channelName>[^/]+)$', consumers.stableCompute.as_asgi()),
]
