import os
import re

isRunning = True

def showMenu():
    print("Ready for Refucktor")
    print("1. Split js file into multiple files")
    print("X. Exit")
    choice = input("Enter your choice: ")
    
    if(choice == "x" or choice == "X"):
        global isRunning
        isRunning = False
    elif(choice == "1"):
        splitJsFile()
    else:
        print("Invalid choice")

def splitJsFile():
    print("Splitting js file into multiple files")

    # Ask for the source js file
    source_file = input("Enter the source JavaScript file path: ")
    
    # Get the directory where this script is located
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Resolve the path relative to the script directory
    if not os.path.isabs(source_file):
        source_file = os.path.join(script_dir, source_file)
    
    # Normalize the path to handle .. properly
    source_file = os.path.normpath(source_file)
    
    print(f"Script directory: {script_dir}")
    print(f"Looking for file: {source_file}")
    print(f"File exists: {os.path.exists(source_file)}")
    
    try:
        with open(source_file, 'r', encoding='utf-8') as f:
            source_content = f.read()
    except FileNotFoundError:
        print(f"Error: File '{source_file}' not found")
        print(f"Current working directory: {os.getcwd()}")
        # Try to list files in the parent directory
        parent_dir = os.path.dirname(script_dir)
        if os.path.exists(parent_dir):
            print(f"Files in parent directory ({parent_dir}):")
            try:
                for file in os.listdir(parent_dir):
                    if file.endswith('.js'):
                        print(f"  - {file}")
            except Exception as e:
                print(f"Could not list parent directory: {e}")
        return
    except Exception as e:
        print(f"Error reading file: {e}")
        return

    # Parse the JavaScript file to identify top-level elements
    code_elements = parseJavaScriptFile(source_content)
    
    if not code_elements:
        print("No code elements found in the file")
        return

    # Separate imports/variables from functions/classes
    imports_and_vars = [elem for elem in code_elements if elem['type'] in ['import', 'variable']]
    functions_and_classes = [elem for elem in code_elements if elem['type'] in ['function', 'class']]

    # Display found functions and classes only
    print(f"\nFound {len(functions_and_classes)} functions/classes:")
    for i, element in enumerate(functions_and_classes, 1):
        print(f"{i}. {element['type']}: {element['name']}")

    # Ask for destination files
    print("\nEnter destination files (one per line, empty line to finish):")
    print("The first file you enter will be the DEFAULT file. Any function/class not assigned to another file will go there.")
    destination_files = []
    while True:
        dest_file = input("Destination file: ").strip()
        if not dest_file:
            break
        destination_files.append(dest_file)

    if not destination_files:
        print("No destination files specified")
        return

    default_file = destination_files[0]

    # Create destination file contents
    file_contents = {dest: [] for dest in destination_files}
    
    # Automatically add imports and variables to all files
    for dest in destination_files:
        file_contents[dest].extend(imports_and_vars)
    
    # Ask user to assign functions/classes to files
    print("\nAssign functions/classes to destination files:")
    print(f"For each file (except the default: {default_file}), enter the numbers of the functions/classes to move to that file. For example: 2, 4, 7. Press Enter to skip.")
    print(f"Any function/class not assigned to another file will go to the default file: {default_file}.")
    print("Available functions/classes:")
    for i, element in enumerate(functions_and_classes, 1):
        print(f"{i}. {element['type']} '{element['name']}'")
    assigned = set()
    for j, dest in enumerate(destination_files, 1):
        if dest == default_file:
            continue  # Skip prompt for default file
        prompt = f"\nWhich functions/classes should be moved to '{dest}'? Enter numbers (e.g., 2, 4, 7) or press Enter to skip: "
        choice = input(prompt).strip()
        if not choice:
            continue
        # Parse input for numbers
        numbers = []
        if choice.startswith('[') and choice.endswith(']'):
            numbers = re.findall(r'\d+', choice)
        else:
            numbers = re.findall(r'\d+', choice)
        numbers = [int(n) for n in numbers if n.isdigit()]
        if not numbers:
            print("No valid numbers found.")
            continue
        for n in numbers:
            if 1 <= n <= len(functions_and_classes):
                file_contents[dest].append(functions_and_classes[n-1])
                assigned.add(n)
                print(f"Added element {n} to {dest}")
            else:
                print(f"Element {n} is out of range.")
    # Add all unassigned functions/classes to the default file
    for i, element in enumerate(functions_and_classes, 1):
        if i not in assigned:
            file_contents[default_file].append(element)
            print(f"Added element {i} to default file {default_file}")

    # Generate the output files
    generateOutputFiles(file_contents, destination_files)

def parseJavaScriptFile(content):
    """Parse JavaScript file to identify top-level elements"""
    elements = []
    lines = content.split('\n')
    
    current_element = None
    brace_count = 0  # Global brace counter
    in_multiline_comment = False
    
    print(f"DEBUG: Processing {len(lines)} lines")
    
    for line_num, line in enumerate(lines, 1):
        stripped = line.strip()
        
        # Handle multiline comments
        if '/*' in line:
            in_multiline_comment = True
        if '*/' in line:
            in_multiline_comment = False
            if current_element:
                current_element['content'].append(line)
            continue
        if in_multiline_comment:
            if current_element:
                current_element['content'].append(line)
            continue
            
        # Count braces BEFORE processing the line
        old_brace_count = brace_count
        brace_count += line.count('{') - line.count('}')
        
        # If we have a current element, add the line to it
        if current_element:
            current_element['content'].append(line)
            
            # Check if we've returned to top level (brace_count == 0)
            if brace_count == 0 and old_brace_count > 0:
                # Function/class is complete
                print(f"DEBUG: Completed {current_element['type']} '{current_element['name']}' at line {line_num}")
                elements.append(current_element)
                current_element = None
            continue
        
        # Skip empty lines and comments at top level
        if not stripped or stripped.startswith('//'):
            continue
            
        # Only process declarations at top level (brace_count == 0)
        if brace_count == 0:
            # Detect function declarations - check for 'function' keyword
            if 'function ' in stripped:
                func_name = extractFunctionName(stripped)
                if func_name:
                    print(f"DEBUG: Found function '{func_name}' at line {line_num}")
                    current_element = {
                        'type': 'function',
                        'name': func_name,
                        'content': [line],
                        'start_line': line_num
                    }
                    continue
                    
            # Detect class declarations
            if stripped.startswith('class '):
                class_name = extractClassName(stripped)
                if class_name:
                    print(f"DEBUG: Found class '{class_name}' at line {line_num}")
                    current_element = {
                        'type': 'class',
                        'name': class_name,
                        'content': [line],
                        'start_line': line_num
                    }
                    continue
                
            # Detect imports
            if stripped.startswith('import '):
                elements.append({
                    'type': 'import',
                    'name': stripped,
                    'content': [line],
                    'start_line': line_num
                })
                continue
                    
            # Detect variable declarations
            if any(keyword in stripped for keyword in ['let ', 'const ', 'var ']):
                var_name = extractVariableName(stripped)
                if var_name:
                    elements.append({
                        'type': 'variable',
                        'name': var_name,
                        'content': [line],
                        'start_line': line_num
                    })
                    continue
                
    # Add any remaining element
    if current_element:
        print(f"DEBUG: Adding remaining {current_element['type']} '{current_element['name']}'")
        elements.append(current_element)
    
    print(f"DEBUG: Found {len(elements)} total elements")
    for elem in elements:
        print(f"DEBUG: - {elem['type']}: {elem['name']}")
        
    return elements

def extractFunctionName(line):
    """Extract function name from function declaration"""
    if 'function ' in line:
        # Handle function declaration
        parts = line.split('function ')
        if len(parts) > 1:
            func_part = parts[1].split('(')[0].strip()
            return func_part
    return None

def extractVariableName(line):
    """Extract variable name from variable declaration"""
    for keyword in ['let ', 'const ', 'var ']:
        if keyword in line:
            parts = line.split(keyword, 1)
            if len(parts) > 1:
                var_part = parts[1].split('=')[0].split(';')[0].strip()
                return var_part
    return None

def extractClassName(line):
    """Extract class name from class declaration"""
    if line.startswith('class '):
        parts = line.split('class ', 1)
        if len(parts) > 1:
            class_part = parts[1].split('{')[0].split('extends')[0].strip()
            return class_part
    return None

def generateOutputFiles(file_contents, destination_files):
    """Generate the output files with assigned content"""
    print("\nGenerating output files...")
    
    # Get the directory where this script is located (refucktor folder)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    for dest_file in destination_files:
        elements = file_contents[dest_file]
        if not elements:
            print(f"Warning: No content assigned to {dest_file}")
            continue
            
        # Create the file content
        content_lines = []
        
        # Add imports first
        imports = [elem for elem in elements if elem['type'] == 'import']
        for imp in imports:
            content_lines.extend(imp['content'])
        
        if imports:
            content_lines.append('')  # Empty line after imports
            
        # Add other elements
        other_elements = [elem for elem in elements if elem['type'] != 'import']
        for elem in other_elements:
            content_lines.extend(elem['content'])
            content_lines.append('')  # Empty line between elements
            
        # Create full path in refucktor directory
        full_path = os.path.join(script_dir, dest_file)
        
        # Write the file
        try:
            with open(full_path, 'w', encoding='utf-8') as f:
                f.write('\n'.join(content_lines))
            print(f"Created: {dest_file} (in {script_dir})")
        except Exception as e:
            print(f"Error writing {dest_file}: {e}")

# main
if __name__ == "__main__":
    # clear the console
    os.system('cls' if os.name == 'nt' else 'clear')
    
    while isRunning:
        showMenu()

    print("Refucked!")