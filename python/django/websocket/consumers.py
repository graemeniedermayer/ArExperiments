### WARNING THIS IS SUPER SUSCEPTIBLE TO XXS ATTACKS in its current implementation.

from asgiref.sync import async_to_sync
from channels.generic.websocket import WebsocketConsumer
import json, pickle, base64
from datetime import datetime, timedelta, timezone
from django.conf import settings

class desktopDevice(WebsocketConsumer):
    def connect(self):
        self.accept()
        self.channelName = self.scope['url_route']['kwargs']['channelName']
        async_to_sync(self.channel_layer.group_add)(
            'desktop' + self.channelName,
            self.channel_name
        )
    def disconnect(self, close_code):
        async_to_sync(self.channel_layer.group_discard)(
            'desktop'+ self.channelName,
            self.channel_name
        )      
    # This is dumb and will break when
    # more than two clients are connects
    def receive(self, text_data):
        data =text_data
        try:
            async_to_sync(self.channel_layer.group_send)(
                'mobile' + self.channelName,
                {
                    'type': 'sendToMobile',
                    'data': data
                }
            )
        except:
            pass
            # second used is not connected
        
    def sendToDesktop(self, event):
        self.send(
            text_data=event['data']
        )

class mobileDevice(WebsocketConsumer):
    def connect(self):
        self.accept()
        self.channelName = self.scope['url_route']['kwargs']['channelName']
        async_to_sync(self.channel_layer.group_add)(
            'mobile' + self.channelName,
            self.channel_name
        )
    def disconnect(self, close_code):
        async_to_sync(self.channel_layer.group_discard)(
            'mobile'+ self.channelName,
            self.channel_name
        )      
    # This is dumb and will break when
    # more than two clients are connects
    def receive(self, text_data):
        data = text_data
        try:
            async_to_sync(self.channel_layer.group_send)(
                'desktop' + self.channelName,
                {
                    'type': 'sendToDesktop',
                    'data': data
                }
            )
        except:
            pass
            # second socket is open
        
    def sendToMobile(self, event):
        self.send(
            text_data= event['data']
        )
