import asyncio
from app.services import land_service, local_data_service

async def test():
    print('Testing local_data_service...')
    districts = local_data_service.get_local_districts('karnataka')
    print(f'  Districts: {len(districts)} found')

    taluks = local_data_service.get_local_taluks('Bengaluru Rural', 'karnataka')
    print(f'  Taluks: {len(taluks)} found')

    print('Testing land_service...')
    admin = await land_service.get_admin_hierarchy('1001', 'lgd')
    print(f'  Admin hierarchy found: {admin.get("found", False)}')

    print('\nTesting get_nearby_admin...')
    nearby = await land_service.get_nearby_admin(13.1234, 77.5678)
    print(f'  Nearby admin found: {nearby.get("found", False)}')

    print('\nAll tests passed!')

if __name__ == '__main__':
    asyncio.run(test())