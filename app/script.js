document.addEventListener("DOMContentLoaded", function() {
    const allData = {}; // Store all parsed data globally
    const itemContainer = document.querySelector("#tables-container");
    const categoryFilter = document.getElementById("category-filter");
    const searchInput = document.getElementById("search-input");

    fetch('../README.md')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok: ' + response.statusText);
            }
            return response.text();
        })
        .then(data => {
            console.log("README.md loaded successfully.");
            Object.assign(allData, parseAllData(data)); // Store parsed data
            console.log("Parsed Data:", allData);
            populateItems(allData); // Populate items initially
        })
        .catch(error => console.error('Error loading README.md:', error));

    categoryFilter.addEventListener('change', function() {
        const selectedCategory = this.value;
        filterItems(selectedCategory, searchInput.value);
    });

    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        filterItems(categoryFilter.value, searchTerm);
    });

    function filterItems(selectedCategory, searchTerm) {
        itemContainer.innerHTML = ''; // Clear existing items

        // Create a temporary object to hold grouped items
        const groupedItems = {};

        for (const category in allData) {
            if (selectedCategory === "all" || selectedCategory === category) {
                allData[category].forEach(project => {
                    // Check if the project name includes the search term
                    if (project.name.toLowerCase().includes(searchTerm)) {
                        // If the category is not already in the groupedItems, create an array for it
                        if (!groupedItems[category]) {
                            groupedItems[category] = [];
                        }
                        groupedItems[category].push(project);
                    }
                });
            }
        }

        // Now populate the items from the groupedItems object
        for (const category in groupedItems) {
            const categoryHeader = document.createElement("h2");
            categoryHeader.textContent = category; // Use the category name as the header
            itemContainer.appendChild(categoryHeader);

            groupedItems[category].forEach(project => {
                const itemDiv = document.createElement("div");
                itemDiv.classList.add("item");

                // Format the "X" field as a hyperlink
                const xFieldMatch = project.x.match(/\[(.+?)\]\((.+?)\)/); // Match [Name](URL)
                let xFieldContent = project.x; // Default to original if no match

                if (xFieldMatch) {
                    const linkText = xFieldMatch[1]; // Text inside []
                    const linkUrl = xFieldMatch[2]; // URL inside ()
                    xFieldContent = `<a href="${linkUrl}" target="_blank">${linkText}</a>`; // Create hyperlink
                }

                // Format the Status field to be italic
                const formattedStatus = `<em>${project.status}</em>`; // Wrap status in <em> tags

                // Conditionally render the Eco field
                const ecoFieldContent = project.eco ? `<p><strong>Eco:</strong> ${project.eco}</p>` : '';

                itemDiv.innerHTML = `
                    <h3>${project.name}</h3>
                    <p><strong>Description:</strong> ${project.description}</p>
                    ${ecoFieldContent}
                    <p><strong>X:</strong> ${xFieldContent}</p>
                    <p><strong>Status:</strong> ${formattedStatus}</p>
                    <p><strong>People:</strong> ${project.people}</p>
                `;
                itemContainer.appendChild(itemDiv);
            });
        }
    }

    function parseAllData(data) {
        const categories = {};
        const regex = /### (.+?)([\s\S]*?)(?=\n###|$)/g; // Match all sections starting with ###
        let match;

        console.log("Raw README.md data:", data); // Log the raw data

        while ((match = regex.exec(data)) !== null) {
            const categoryName = match[0].substring(3).split('\n')[0].trim();
            const sectionStart = match.index;
            const sectionEnd = match.index + match[0].length;
            const sectionContent = data.substring(sectionStart, sectionEnd).trim();

            console.log(`Parsing category: ${categoryName}`);
            console.log(`Section content: ${sectionContent}`);

            // Log the Events section content specifically
            if (categoryName === "Events") {
                console.log("Events section:", sectionContent);
            }

            // Check if sectionContent is not empty before parsing
            if (sectionContent) {
                categories[categoryName] = parseCategoryData(sectionContent, categoryName);
            } else {
                console.warn(`No content found for category: ${categoryName}`);
            }
        }

        console.log("Final parsed categories:", categories);
        return categories;
    }

    function parseCategoryData(section, categoryName) {
        const categoryData = [];
        const lines = section.split('\n').filter(line => line.trim() !== '');

        console.log(`Lines in section: ${lines.length}`);

        for (let i = 1; i < lines.length; i++) { // Start from 1 to skip the header
            const line = lines[i].trim();
            // Skip lines that are non-text (e.g., containing "-----")
            if (line.includes('-----')) {
                console.warn("Skipping non-text line:", line);
                continue;
            }

            const columns = line.split('|').map(col => col.trim()).filter(col => col);
            console.log(`Parsed columns from line ${i}:`, columns);

            if (columns.length >= 5) { // Ensure there are enough columns
                // Parse the name and website from the first column
                const nameWithLink = columns[0];
                const nameMatch = nameWithLink.match(/\[(.+?)\]\((.+?)\)/); // Match [Name](URL)

                let projectName = '';
                let projectWebsite = '';

                if (nameMatch) {
                    projectName = nameMatch[1]; // Extract the name
                    projectWebsite = nameMatch[2]; // Extract the URL
                } else {
                    console.warn("No valid link format found in name:", nameWithLink);
                    continue; // Skip this entry if the format is incorrect
                }

                // Determine the "people" field based on the category
                let peopleField;
                if (categoryName === "Events") {
                    if (columns.length >= 5) {
                        peopleField = columns[4]; // Assuming the Organizers column is the 5th column (index 4)
                    } else {
                        console.warn("Insufficient columns for Events category:", line);
                        continue; // Skip this entry if not enough columns
                    }
                } else {
                    if (columns.length >= 6) {
                        peopleField = columns[5]; // Assuming the Founders column is the 6th column (index 5)
                    } else {
                        console.warn("Insufficient columns for other categories:", line);
                        continue; // Skip this entry if not enough columns
                    }
                }

                // Format the people field
                const peopleMatch = peopleField.match(/\[(.+?)\]\((.+?)\)/g); // Match all [Name](URL) formats
                let formattedPeople = peopleField; // Default to original if no match

                if (peopleMatch) {
                    formattedPeople = peopleMatch.map(person => {
                        const personMatch = person.match(/\[(.+?)\]\((.+?)\)/);
                        return `<a href="${personMatch[2]}" target="_blank">${personMatch[1]}</a>`;
                    }).join(', '); // Join multiple people with a comma
                }

                const projectData = {
                    name: projectName,
                    website: projectWebsite, // Store the website separately
                    description: columns[1],
                    eco: categoryName === "Events" ? null : columns[2], // Store eco only if not Events
                    x: categoryName === "Events" ? columns[2] : columns[3],
                    status: categoryName === "Events" ? columns[3].replace(/`/g, '') : columns[4].replace(/`/g, ''), // Remove backticks from status
                    people: formattedPeople // Store formatted people
                };

                // Log the project data if the category is Events
                if (categoryName === "Events") {
                    console.log("Parsed Events data:", projectData);
                }

                categoryData.push(projectData);
                console.log("Added project data:", projectData);
            } else {
                console.warn("Skipping line due to insufficient columns:", line);
            }
        }
        console.log(`Parsed category data:`, categoryData);
        return categoryData;
    }

    function populateItems(allData) {
        const itemContainer = document.querySelector("#tables-container");
        const categoryFilter = document.getElementById("category-filter");

        // Clear existing items
        itemContainer.innerHTML = '';
        categoryFilter.innerHTML = ''; // Clear existing options in the filter

        // Add "All Categories" option
        const allOption = document.createElement("option");
        allOption.value = "all";
        allOption.textContent = "All Categories";
        categoryFilter.appendChild(allOption);

        // Populate the category filter with actual categories
        for (const category in allData) {
            const option = document.createElement("option");
            option.value = category;
            option.textContent = category; // Use the category name as the option text
            categoryFilter.appendChild(option);
        }

        // Populate the items for the initial view
        for (const category in allData) {
            const categoryHeader = document.createElement("h2");
            categoryHeader.textContent = category; // Use the category name as the header
            itemContainer.appendChild(categoryHeader);

            allData[category].forEach(project => {
                const itemDiv = document.createElement("div");
                itemDiv.classList.add("item");

                // Format the "X" field as a hyperlink
                const xFieldMatch = project.x.match(/\[(.+?)\]\((.+?)\)/); // Match [Name](URL)
                let xFieldContent = project.x; // Default to original if no match

                if (xFieldMatch) {
                    const linkText = xFieldMatch[1]; // Text inside []
                    const linkUrl = xFieldMatch[2]; // URL inside ()
                    xFieldContent = `<a href="${linkUrl}" target="_blank">${linkText}</a>`; // Create hyperlink
                }

                // Format the Status field to be italic
                const formattedStatus = `<em>${project.status}</em>`; // Wrap status in <em> tags

                // Conditionally render the Eco field
                const ecoFieldContent = project.eco ? `<p><strong>Eco:</strong> ${project.eco}</p>` : '';

                itemDiv.innerHTML = `
                    <h3>${project.name}</h3>
                    <p><strong>Description:</strong> ${project.description}</p>
                    ${ecoFieldContent}
                    <p><strong>X:</strong> ${xFieldContent}</p>
                    <p><strong>Status:</strong> ${formattedStatus}</p>
                    <p><strong>People:</strong> ${project.people}</p>
                `;
                itemContainer.appendChild(itemDiv);
            });
        }
    }
});
