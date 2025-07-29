#!/bin/bash
clear
# Your initial string
initial_string=""

# Set the filename for the ID
id_file="id.bin"

# Check if id.bin exists
if [ ! -e "$id_file" ]; then
    # Generate 6 random characters if id.bin does not exist
    random_chars=$(LC_CTYPE=C tr -dc 'a-zA-Z0-9' < /dev/urandom | head -c 6)

    # Combine the initial string with random characters
    result_string="${initial_string}${random_chars}"

    # Save the result in the id.bin file
    echo "$result_string" > "$id_file"

    # Display a message for registration
    echo "Registration...."
else
    # Display a message if id.bin already exists
    echo "id accepted"
fi

# Read the ID from the file
id=$(<"$id_file")

# Check if the ID is listed on the web page
web_page_url="https://domarx.my.id"  # Replace with the actual web page URL
if curl -s "$web_page_url" | grep -q "$id"; then
    # Get the expected password from the user
    echo -n "password: "
    read -r expected_text

    # Retrieve the web page title
    web_title=$(curl -s https://domarx.my.id/password.html | grep -o -m 1 "<title>[^<]*" | sed -e 's/<title>//')

    if [ "$web_title" == "$expected_text" ]; then
        echo "Password accepted! Executing command..."

        # Prompt user for store code once and store it
        echo -n "Enter Store Code: "
        read STORE_CODE

        # Run the get4.js script with the user input store name
        #node get4.js "$STORE_CODE"
        #if [ $? -eq 0 ]; then
            # If there was no error in get4.js, run the other scripts
            
            
            node crev13.js "$STORE_CODE"  # Pass STORE_CODE to crev7.js

            # Move the file to the destination folder
            mv stok.xlsx ~/storage/shared/kampret/

            # Loop to prompt user for multiple PLU inputs
while true; do
    echo "Cek stok lagi? Ketik 'y' atau 'n' untuk berhenti: "
    read PLU

    # Convert input to lowercase to handle both 'y' and 'Y', and 'n' and 'N'
    PLU=$(echo "$PLU" | tr '[:upper:]' '[:lower:]')

    # Check if input is 'y' or 'n'
    if [ "$PLU" == "y" ]; then
        # Reuse STORE_CODE for the subsequent iterations
        echo "Running for Store Code: $STORE_CODE"
        node crev12.js "$STORE_CODE" "$PLU"  # Pass STORE_CODE and PLU to crev7.js
    elif [ "$PLU" == "n" ]; then
        echo "Berhenti memasukkan PLU. Keluar."
        break
    else
        # If input is not 'y' or 'n', ask again
        echo "Input tidak valid, silakan ketik 'y' atau 'n'."
    fi
done

       
      
    else
        echo "Password does not match the expected value. Exiting."
    fi
else
    # Display the ID from id.bin if the ID is not found on the webpage
    echo "ID ($id) belum terdaftar"
fi
