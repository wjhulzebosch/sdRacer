isRunning = True

def showMenu():
    print("Ready for Refucktor")
    print("1. Split js file into multiple files")
    print("X. Exit")
    choice = input("Enter your choice: ")
    
    if(input == "x" or input == "X"):
        isRunning = False
    elif(input == "1"):
        splitJsFile()
    else:
        print("Invalid choice")

def splitJsFile():
    print("Splitting js file into multiple files")

    # Ask for the source js file

    # Ask for destination files (should be an array of files, since we can split into multiple files)

    # List all code in the top scope (classes, functions, variables, etc.)

    # Loop through the file-list the user proviced and ask what code should be moved to it;
    # Code can be moved to multiple files (for example, imports will be in more than one output file)


# main
if __name__ == "__main__":
    while isRunning:
        showMenu()

    print("Refucked!")