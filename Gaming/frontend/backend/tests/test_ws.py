import asyncio, websockets, json
async def main():
  ws = await websockets.connect('ws://localhost:8765')
  await ws.send(json.dumps({'command': 'request_state'}))
  res = await ws.recv()
  d = json.loads(res)
  print('Keys:', list(d.keys()))
  if 'system_specs' in d: print('Keys inside system_specs:', list(d['system_specs'].keys()))
if __name__ == "__main__":
    asyncio.run(main())
