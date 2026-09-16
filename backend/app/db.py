import pymysql

from app.config import Config


def get_connection():
    return pymysql.connect(
        host=Config.DB_HOST,
        port=Config.DB_PORT,
        user=Config.DB_USER,
        password=Config.DB_PASSWORD,
        database=Config.DB_NAME,
        ssl={"ssl": {}},
        cursorclass=pymysql.cursors.DictCursor
    )