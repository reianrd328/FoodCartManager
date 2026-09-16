import os
import pymysql
from dotenv import load_dotenv

load_dotenv()

print("================================")
print("   FoodCartManager DB Test")
print("================================")

print("Host:", os.getenv("DB_HOST"))
print("Port:", os.getenv("DB_PORT"))
print("User:", os.getenv("DB_USER"))
print("Database:", os.getenv("DB_NAME"))

try:
    connection = pymysql.connect(
        host=os.getenv("DB_HOST"),
        port=int(os.getenv("DB_PORT", "4000")),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME"),
        ssl={"ssl": {}}
    )

    print()
    print("SUCCESS!")
    print("Connected to TiDB successfully.")

    with connection.cursor() as cursor:

        cursor.execute("SELECT DATABASE();")
        database = cursor.fetchone()

        print("Connected database:", database[0])

        cursor.execute("SHOW TABLES;")
        tables = cursor.fetchall()

        print()
        print("Tables in foodcart:")

        for table in tables:
            print(" -", table[0])

    connection.close()

    print()
    print("Connection closed.")

except Exception as e:
    print()
    print("ERROR:")
    print(e)