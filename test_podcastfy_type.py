import inspect
from podcastfy.client import generate_podcast

if inspect.iscoroutinefunction(generate_podcast):
    print("generate_podcast is ASYNC")
else:
    print("generate_podcast is SYNC")
