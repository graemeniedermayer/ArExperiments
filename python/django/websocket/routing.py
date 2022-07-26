from django.conf.urls import url

from . import consumers

# This contain regex (regular expressions.) ENSURE THIS IS SECURE AGAINST ATTACKS!!! regex is an opening. Oh shit...
websocket_urlpatterns = [
    url(r'^ws/arMobile/(?P<channelName>[^/]+)$', consumers.mobileDevice.as_asgi()),
    url(r'^ws/arDesktop/(?P<channelName>[^/]+)$', consumers.desktopDevice.as_asgi())
]
