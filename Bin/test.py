print("--- Starting Trading Script ---")

stock_name = 'NIFTY'
ltp = tsl.get_ltp_data(names=[stock_name])[stock_name]
print(f"LTP of {stock_name}: {ltp}")

print("\n--- Script Finished ---")

print("Hi")
