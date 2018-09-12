#! /usr/bin/env python

import argparse
import json
import datetime
from telethon import TelegramClient, types, sync

def run(args):
	id = args.api_name
	api_id = args.api_id
	api_hash = args.api_hash
	channel_name = args.channel_name
	with TelegramClient(id, api_id, api_hash) as client:
		message = client.get_messages(channel_name, ids=types.InputMessagePinned())
		print(json.dumps({"message": message.message, "date":message.date}, default=myconverter))
		return message

def myconverter(o):
    if isinstance(o, datetime.datetime):
        return o.__str__()

def main():
	parser=argparse.ArgumentParser()
	parser.add_argument("-channel_name", dest="channel_name", type=str, required=True)
	parser.add_argument("-api_name", dest="api_name", type=str, required=True)
	parser.add_argument("-api_id", dest="api_id", type=str, required=True)
	parser.add_argument("-api_hash", dest="api_hash", type=str, required=True)
	parser.set_defaults(func=run)
	args=parser.parse_args()
	args.func(args)

if __name__ == "__main__":
	main()
