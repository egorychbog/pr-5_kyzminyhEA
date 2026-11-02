import aiohttp
import asyncio
import json
from datetime import datetime

MAKE_API_URL = "https://fleetcatalog.disturbingbyte.pt/v1/makes"
VIN_API_URL = "https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended"


MAKE = "Honda"
VIN = "1HGCM82633A004352"
MODEL_YEAR = 2003

TIMEOUT = 5
INTERVAL = 600
MAX_RETRIES = 3
semaphore = asyncio.Semaphore(3)


async def fetch_data(session, url, params=None):
    
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            async with semaphore:
                async with session.get(
                    url, params=params,
                    timeout=aiohttp.ClientTimeout(total=TIMEOUT)
                ) as response:
                    response.raise_for_status()
                    return await response.json()

        except asyncio.TimeoutError:
            error = "Превышено время ожидания"
        except aiohttp.ClientResponseError as exc:
            error = f"HTTP {exc.status}"
            if exc.status not in (429, 500, 502, 503, 504):
                return {"error": error}
        except (aiohttp.ClientError, json.JSONDecodeError) as exc:
            error = str(exc)

        print(f"Попытка {attempt}/{MAX_RETRIES}: {error}")
        if attempt < MAX_RETRIES:
            await asyncio.sleep(attempt)

    return {"error": error}


def get_make_info(data):
    
    if isinstance(data, dict) and "items" in data:
        return [
            {"name": item.get("name"), "country": item.get("country")}
            for item in data["items"]
        ]
    return data


def get_vehicle_specs(data):
    
    if isinstance(data, dict) and data.get("Results"):
        vehicle = data["Results"][0]
        fields = [
            "Make", "Model", "ModelYear", "VehicleType",
            "BodyClass", "EngineCylinders", "DisplacementL",
            "FuelTypePrimary", "DriveType", "TransmissionStyle"
        ]
        return {key: vehicle.get(key) for key in fields
                if vehicle.get(key) not in ("", None)}
    return data


async def collect_data(session):
    
    make_task = fetch_data(
        session, MAKE_API_URL,
        {"search": MAKE, "pageSize": 5}
    )
    specs_task = fetch_data(
        session, f"{VIN_API_URL}/{VIN}",
        {"format": "json", "modelyear": MODEL_YEAR}
    )

    make_data, specs_data = await asyncio.gather(
        make_task, specs_task
    )

    return {
        "timestamp": datetime.now().astimezone().isoformat(),
        "make": get_make_info(make_data),
        "vehicle_characteristics": get_vehicle_specs(specs_data)
    }


def save_data(data, filename="cars_data.json"):

    try:
        with open(filename, "r", encoding="utf-8") as file:
            records = json.load(file)
        if not isinstance(records, list):
            records = [records]
    except (FileNotFoundError, json.JSONDecodeError):
        records = []

    records.append(data)
    with open(filename, "w", encoding="utf-8") as file:
        json.dump(records, file, ensure_ascii=False, indent=4)


async def main():
    async with aiohttp.ClientSession() as session:
        while True:
            print("\nПолучение данных об автомобиле...")
            data = await collect_data(session)
            save_data(data)

            print(json.dumps(data, ensure_ascii=False, indent=4))
            print("\nДанные сохранены в cars_data.json")
            print("Следующий сбор через 10 минут.")
            await asyncio.sleep(INTERVAL)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nПрограмма остановлена.")