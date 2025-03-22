document.addEventListener("DOMContentLoaded", function() {
    const allData = {}; // Store all parsed data globally
    const itemContainer = document.querySelector("#tables-container");
    const categoryFilter = document.getElementById("category-filter");
    const searchInput = document.getElementById("search-input");
    const ecoFilter = document.getElementById("eco-filter");

    showLoading();

    fetch('https://raw.githubusercontent.com/sqrDAO/Vietnam-Web3-Directory/refs/heads/main/README.md')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok: ' + response.statusText);
            }
            return response.text();
        })
        .then(data => {
            console.log("README.md loaded successfully.");
            Object.assign(allData, parseAllData(data)); // Store parsed data
            populateItems(allData); // Populate items initially
            populateEcoFilter(allData);
            hideLoading();
        })
        .catch(error => {
            console.error('Error loading README.md:', error);
            hideLoading();
        });

    categoryFilter.addEventListener('change', function() {
        const selectedCategory = this.value;
        filterItems(selectedCategory, searchInput.value, ecoFilter.value.toLowerCase());
    });

    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        filterItems(categoryFilter.value, searchTerm, ecoFilter.value.toLowerCase());
    });

    ecoFilter.addEventListener('change', function() {
        const selectedEco = this.value.toLowerCase();
        filterItems(categoryFilter.value, searchInput.value.toLowerCase(), selectedEco);
    });

    // Populate Eco filter options
    function populateEcoFilter(allData) {
        ecoFilter.innerHTML = '';
        const allOption = document.createElement("option");
        allOption.value = "all";
        allOption.textContent = "All Chains";
        ecoFilter.appendChild(allOption);

        const ecoSet = new Set();
        for (const category in allData) {
            allData[category].forEach(project => {
                if (project.eco) {
                    project.eco.split(',').forEach(eco => ecoSet.add(eco.trim()));
                }
            });
        }

        ecoSet.forEach(eco => {
            const option = document.createElement("option");
            option.value = eco.toLowerCase();
            option.textContent = eco;
            ecoFilter.appendChild(option);
        });
    }

    function getEcoIcon(ecos) {
        if (!ecos) {
            return { icons: '', count: 0 }; // Return empty if ecos is null or undefined
        }

        const ecoArray = ecos.split(',').map(eco => eco.trim()); // Split by comma and trim whitespace
        const ecoIcons = ecoArray.map(eco => {
            const imagePath = `img/eco/${eco.toLowerCase()}.svg`; // Construct image path based on ecosystem name
            return `<img src="${imagePath}" alt="${eco}" class="eco-icon">`; // Set size and align
        }).filter(icon => icon !== ''); // Filter out any empty icons

        const uniqueEcos = [...new Set(ecoArray)]; // Get unique ecosystems
        const count = uniqueEcos.length; // Count unique ecosystems
        return { icons: ecoIcons.join(' '), count }; // Return icons and count
    }

    function createProjectCard(project, category) {
        const itemDiv = document.createElement("div");
        itemDiv.classList.add("card");

        const xFieldMatch = project.x.match(/\[(.+?)\]\((.+?)\)/);
        let xFieldContent = project.x;

        if (xFieldMatch) {
            const linkUrl = xFieldMatch[2];
            xFieldContent = `<a href="${linkUrl}" target="_blank"><i class="fab fa-x-twitter"></i></a>`;
        }

        const formattedStatus = `<em>${project.status}</em>`;
        const { icons: ecoIcons } = getEcoIcon(project.eco);
        const ecoFieldContent = project.eco ? `<p><strong>Chains:</strong> ${ecoIcons}</p>` : '';
        const websiteField = project.website ? `<a href="${project.website}" target="_blank"><i class="fas fa-link"></i></a>` : '';

        const imagePath = `img/projects/${project.name.toLowerCase().replace(/ /g, '-').replace(/\./g, '')}.png`;
        const img = new Image();
        img.src = imagePath;

        const renderCard = (withImage = false) => {
            const projectTitle = withImage ? 
                `<h3 class="card-title"><img src="${imagePath}" alt="${project.name}" class="project-icon"> ${project.name}</h3>` :
                `<h3 class="card-title">${project.name}</h3>`;
            
            itemDiv.innerHTML = `
                ${projectTitle}
                <p><strong>Category:</strong> ${category}</p>
                <p>${xFieldContent} ${websiteField}</p>
                <p class="card-description">${project.description}</p>
                ${ecoFieldContent}
                <p><strong>Status:</strong> ${formattedStatus}</p>
                <p><strong>People:</strong> ${project.people}</p>
            `;
        };

        img.onload = () => renderCard(true);
        img.onerror = () => renderCard(false);

        return itemDiv;
    }

    function filterItems(selectedCategory, searchTerm, selectedEco) {
        itemContainer.innerHTML = '';
        itemContainer.classList.add("card-container");

        if (selectedCategory === "all" && searchTerm === "" && selectedEco === "all") {
            populateItems(allData);
            return;
        }

        const groupedItems = {};

        for (const category in allData) {
            if (selectedCategory === "all" || selectedCategory === category) {
                allData[category].forEach(project => {
                    const ecoNames = project.eco ? project.eco.toLowerCase().split(',').map(e => e.trim()) : [];
                    const matchesSearch = project.name.toLowerCase().includes(searchTerm) || ecoNames.some(eco => eco.includes(searchTerm));
                    const matchesEco = selectedEco === "all" || ecoNames.includes(selectedEco);

                    if (matchesSearch && matchesEco) {
                        if (!groupedItems[category]) {
                            groupedItems[category] = [];
                        }
                        groupedItems[category].push(project);
                    }
                });
            }
        }

        for (const category in groupedItems) {
            const categoryHeader = document.createElement("h2");
            categoryHeader.textContent = category;

            groupedItems[category].forEach(project => {
                const cardDiv = createProjectCard(project, category);
                itemContainer.appendChild(cardDiv);
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

            // Check if sectionContent is not empty before parsing
            if (sectionContent) {
                categories[categoryName] = parseCategoryData(sectionContent, categoryName);
            } else {
                console.warn(`No content found for category: ${categoryName}`);
            }
        }

        return categories;
    }

    function parseCategoryData(section, categoryName) {
        const categoryData = [];
        const lines = section.split('\n').filter(line => line.trim() !== '');

        for (let i = 1; i < lines.length; i++) { // Start from 1 to skip the header
            const line = lines[i].trim();
            // Skip lines that are non-text (e.g., containing "-----")
            if (line.includes('-----')) {
                console.warn("Skipping non-text line:", line);
                continue;
            }

            const columns = line.split('|').map(col => col.trim()).filter(col => col);

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
                        if (personMatch[2]) {
                            return `<a href="${personMatch[2]}" target="_blank">${personMatch[1]}</a>`;
                        } else {
                            return person; // Return the original person if no match
                        }
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

                categoryData.push(projectData);
            } else {
                console.warn("Skipping line due to insufficient columns:", line);
            }
        }
        return categoryData;
    }

    function populateItems(allData) {
        const itemContainer = document.querySelector("#tables-container");
        const categoryFilter = document.getElementById("category-filter");

        itemContainer.innerHTML = '';
        categoryFilter.innerHTML = '';

        const allOption = document.createElement("option");
        allOption.value = "all";
        allOption.textContent = "All Categories";
        categoryFilter.appendChild(allOption);

        for (const category in allData) {
            const option = document.createElement("option");
            option.value = category;
            option.textContent = category;
            categoryFilter.appendChild(option);
        }

        for (const category in allData) {
            const categoryHeader = document.createElement("h2");
            categoryHeader.textContent = category;
            itemContainer.appendChild(categoryHeader);

            const cardContainer = document.createElement('div');
            cardContainer.classList.add('card-container');

            allData[category].forEach(project => {
                const cardDiv = createProjectCard(project, category);
                cardContainer.appendChild(cardDiv);
            });

            itemContainer.appendChild(cardContainer);
        }
    }

    function showLoading() {
        document.getElementById('loading').style.display = 'block';
    }

    function hideLoading() {
        document.getElementById('loading').style.display = 'none';
    }
});
