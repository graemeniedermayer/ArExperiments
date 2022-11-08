### WARNING THIS IS SUPER SUSCEPTIBLE TO XXS ATTACKS.

from asgiref.sync import async_to_sync
from channels.generic.websocket import WebsocketConsumer
import json, pickle, base64
from datetime import datetime, timedelta, timezone
from django.conf import settings

class stableClient(WebsocketConsumer):
    def connect(self):
        self.accept()
        self.channelName = self.scope['url_route']['kwargs']['channelName']
        async_to_sync(self.channel_layer.group_add)(
            'client' + self.channelName,
            self.channel_name
        )
    def disconnect(self, close_code):
        async_to_sync(self.channel_layer.group_discard)(
            'client'+ self.channelName,
            self.channel_name
        )      

    # build queues
    def receive(self, text_data):
        data =text_data
        try:
            async_to_sync(self.channel_layer.group_send)(
                'compute' + self.channelName,
                {
                    'type': 'sendToMobile',
                    'data': data
                }
            )
        except:
            pass
            # comput is not connected
        
    def sendToDesktop(self, event):
        self.send(
            text_data=event['data']
        )

class stableCompute(WebsocketConsumer):
    def connect(self):
        self.accept()
        self.channelName = self.scope['url_route']['kwargs']['channelName']
        async_to_sync(self.channel_layer.group_add)(
            'compute' + self.channelName,
            self.channel_name
        )
    def disconnect(self, close_code):
        async_to_sync(self.channel_layer.group_discard)(
            'compute'+ self.channelName,
            self.channel_name
        )      
    def receive(self, text_data):
        data = text_data
        try:
            async_to_sync(self.channel_layer.group_send)(
                'client' + self.channelName,
                {
                    'type': 'sendToDesktop',
                    'data': data
                }
            )
        except:
            pass
            # client is not connected
        
    def sendToMobile(self, event):
        self.send(
            text_data= event['data']
        )

