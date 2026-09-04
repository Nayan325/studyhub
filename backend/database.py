import mysql.connector


connection = mysql.connector.connect(
    host="localhost",
    user="root",
    password="Nayan@2005",
    database="studyhub"
)

if connection.is_connected():
    print("MySQL connected successfully! ✅")


cursor = connection.cursor()

cursor.execute("SELECT * FROM users")

users = cursor.fetchall()

print("\nUsers:")

for user in users:
    print(user)


cursor.close()
connection.close()