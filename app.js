const d3Tableau = () => {
	//required to sync with tableau dashboard
	const initAsync = () => {
		return tableau.extensions.initializeAsync();
	};

	//getDataTable from a certain Sheet within the Dashboard
	const getDataTable = (sheetName) => {
		const worksheets =
			tableau.extensions.dashboardContent.dashboard.worksheets;
		var worksheet = worksheets.find(function (sheet) {
			return sheet.name === sheetName;
		});
		console.log(worksheet);
		return worksheet.getSummaryDataAsync().then(function (worksheetData) {
			return [worksheetData, worksheet];
		});
	};

	//give our datatable headers
	const getLinksFields = (dataTable) => {
		const fieldIdx_links = (fieldName) => {
			const field = dataTable.columns.find(
				(column) => column.fieldName === fieldName
			);
			return field.index;
		};
		const list = [];
		for (const [i, row] of dataTable.data.entries()) {
			list.push({
				source: row[fieldIdx_links("Source")].value,
				target: row[fieldIdx_links("Target")].value,
			});
		}
		return list;
	};

	const getNodeFields = (dataTable) => {
		const fieldIdx = (fieldName) => {
			const field = dataTable.columns.find(
				(column) => column.fieldName === fieldName
			);
			return field.index;
		};

		const list = [];

		for (const [i, row] of dataTable.data.entries()) {
			list.push({
				index: i,
				ID: row[fieldIdx("ID")].value,				
				Case_ID: row[fieldIdx("Case Id")].value,
				idLabel: row[fieldIdx("Id Label")].value,
				Case_FirstName: row[fieldIdx("Case First Name")].value,
				Case_LastName: row[fieldIdx("Case Last Name")].value,
				Case_Variant: row[fieldIdx("Case Variant Result")].value,
				Case_Zone: row[fieldIdx("Case Zone")].value,				
				Case_Age: row[fieldIdx("Case Age")].value,
				Dateofdiagnosis: row[fieldIdx("Dateofdiagnosis")].value,
				RECORD_TYPE: row[fieldIdx("Record Type")].value,
				contactId: row[fieldIdx("Contact Id")].value,
				contactFirstName: row[fieldIdx("Contact First Name")].value,
				contactLastName: row[fieldIdx("Contact Last Name")].value,
				contactAge: row[fieldIdx("Contact Age")].value,
			});
		}
		return list;
	};

	async function getData() {
		//initialize
		const initialize = await initAsync();

		//links
		const [linksDataTable, linksSheet] = await getDataTable("links_table");
		const linksFields = await getLinksFields(linksDataTable);

		//nodes
		const [nodeDataTable, nodeSheet] = await getDataTable("node_table");
		const nodeFields = await getNodeFields(nodeDataTable);

		//combine nodes & links into d3_data

		d3_data = { nodes: nodeFields, links: linksFields };
		originalFields = { ...d3_data };
		console.log("originalFields", originalFields);

		//Event Listeners, nodes & lniks
		//filter event handlers functions
		async function linksFilterChangedHandler() {
			console.log("links filter triggered");
		}

		async function nodeFilterChangedHandler(originalFields) {
			console.log("node filter triggered");

			//nodes
			const [nodeDataTable, nodeSheet] = await getDataTable("node_table");
			const nodeFields = await getNodeFields(nodeDataTable);

			const [linksDataTable, linksSheet] = await getDataTable("links_table");
			const linksFields = await getLinksFields(linksDataTable);

			//updated by Ety
			//const originalLinksFields = originalFields.links;
			//console.log("originalLinksFields", originalLinksFields);

			//Ensure all nodes that are in filtered table remain, as well as all nodes that are targets of nodes in table
			//all nodes from filtered table = nodeFields
			//targets = iterate over links.source[i].id, push links[i] to new array

			console.log("nodeFields", nodeFields);
			console.log("linksFields", linksFields);

			const finalNodeField = [...nodeFields];

			filteredLinks = [];
			//updated by Ety
			for (let i = 0; i < linksFields.length; i++) {
				if (
					nodeFields.some((e) => e.ID === linksFields[i].target)
				) {
					filteredLinks.push({
						source: linksFields[i].source,
						target: linksFields[i].target,
					});
				} 
			}

			console.log("filteredLinks", filteredLinks);

			const filtered_d3_data = {
				nodes: nodeFields,
				links: filteredLinks,
			};

			console.log(filtered_d3_data);

			d3_functions(filtered_d3_data, true);//, nodeSheet);
		}

		//add Listeners
		nodeSheet.addEventListener(
			tableau.TableauEventType.FilterChanged,
			function () {
				nodeFilterChangedHandler(originalFields);
			}
		);

		linksSheet.addEventListener(
			tableau.TableauEventType.FilterChanged,
			linksFilterChangedHandler()
		);

		d3_functions(d3_data, false);
	}

	getData();

	d3_functions = (d3_data, svgCreated) => {
		//////////////////////////////////////////////////////
		// Developed by Moushir Elbishouty - AHS - 2021 March
		// Developed by Moushir Elbishouty - AHS - 2021 March
		//////////////////////////////////////////////////////
		if (svgCreated) {
			d3.selectAll("svg > *").remove();
			console.log("remove svg");
		}

		var svg = d3.select("svg");

		console.log("svg", svg);

		var width = +svg.attr("width");
		var height = +svg.attr("height");

		//Zoom
		var g = svg.append("g").attr("class", "everything");

		//ForceSimulation
		var simulation = d3
			.forceSimulation()
			.force("charge", d3.forceManyBody().strength(-10))
			.force("center", d3.forceCenter(width / 2, height / 2))
			.force(
				"link",
				d3.forceLink().id((d) => d.ID)
			);

		//Arrow
		var marker = g
			.append("marker")
			.attr("id", "resolved")
			.attr("markerUnits", "userSpaceOnUse")
			.attr("viewBox", "0 -5 10 10")
			.attr("refX", 10)
			.attr("refY", 0)
			.attr("markerWidth", 8)
			.attr("markerHeight", 8)
			.attr("orient", "auto")
			.attr("stroke-width", 2)
			.append("path")
			.attr("d", "M0,-5L10,0L0,5")
			.attr("fill", "#000000");

		//Tooltip
		var tooltip = d3
			.select("body")
			.append("div")
			.attr("class", "tooltip")
			.style("position", "absolute")
			.style("padding", "10px")
			.style("z-index", "10")
			.style("width", "300px")
			.style("height", "150px")
			.style("background-color", "rgba(230, 242, 255, 0.8)")
			.style("border-radius", "5px")
			.style("visibility", "hidden")
			.text("");

		async function drawData(d3_data) {
			const graph = d3_data;
			//const graph = await d3.json("./VOC_ALL_Links_No_Null.json");
			console.log("graph", graph);
			var link = g
				.append("g")
				.attr("class", "links")
				.selectAll("line")
				.data(graph.links)
				.enter()
				.append("line");

			var node = g
				.append("g")
				.attr("class", "nodes")
				.selectAll("circle")
				.data(graph.nodes)
				.enter()
				.append("circle")
				.attr("r", 4.5)
				.style("fill", nodeColor)
				.on("mouseover", handleMouseOver)
				.on("mouseout", handleMouseOut)
				.call(
					d3
						.drag()
						.on("start", dragstarted)
						.on("drag", dragged)
						.on("end", dragended)
				);

			simulation
				.nodes(graph.nodes)
				.on("tick", ticked)
				.force("link")
				.links(graph.links);

			function ticked() {
				node.attr("cx", function (d) {
					return d.x;
				}).attr("cy", function (d) {
					return d.y;
				});
				link.attr("x1", function (d) {
					return d.source.x;
				})
					.attr("y1", function (d) {
						return d.source.y;
					})
					.attr("x2", function (d) {
						return d.target.x;
					})
					.attr("y2", function (d) {
						return d.target.y;
					})
					.attr("marker-end", "url(#resolved)");
			}
		}

		//Zoom capabilities
		var zoom_handler = d3.zoom().on("zoom", zoom_actions);

		zoom_handler(svg);

		function dragstarted(d) {
			if (!d3.event.active) simulation.alphaTarget(0.3).restart();
			d.fx = d.x;
			d.fy = d.y;
		}

		function dragged(d) {
			d.fx = d3.event.x;
			d.fy = d3.event.y;
		}

		function dragended(d) {
			if (!d3.event.active) simulation.alphaTarget(0);
			d.fx = null;
			d.fy = null;
		}

		function nodeColor(node) {
			var color;
			if (node.Case_Age >= 0 && node.Case_Age <= 10) color = "#f380f7";
			if (node.Case_Age >= 11 && node.Case_Age <= 20) color = "#371ce0";
			if (node.Case_Age >= 21 && node.Case_Age <= 30) color = "#A52A2A";
			if (node.Case_Age >= 31 && node.Case_Age <= 40) color = "#f07d30";
			if (node.Case_Age >= 41 && node.Case_Age <= 50) color = "#039243";
			if (node.Case_Age >= 51 && node.Case_Age <= 60) color = "lightblue";
			if (node.Case_Age >= 61 && node.Case_Age <= 70) color = "yellow";
			if (node.Case_Age >= 71 && node.Case_Age <= 99) color = "#83288f";

			return color;
		}

		function recordType(node) {
			var type;
			if (node.RECORD_TYPE == "CI - Not Tested") type = "Not Tested";
			if (node.RECORD_TYPE == "CI - Tested Negative") type = "Tested Negative";
			if (node.RECORD_TYPE == "DI - VOC Positive") type = "VOC Positive";
			if (node.RECORD_TYPE == "DI - Wild Type/Not Screen") type = "Wild Type";

			return type;
		}

		function identifiedDate(node) {
			if(node.Dateofdiagnosis !== '%null%')
				{
					return "Identified Date: " + node.Dateofdiagnosis;
				}
				else
				{
					return "Identified Date: N/A";
				}
		}

		/*function findName(node)
		{
			if(node.Case_FirstName !== '%null%')
				{
					return "Name: " + node.Case_FirstName + " " + node.Case_LastName;
				}
				else
				{
					return "Contact Name: " + node.contactFirstName + " " + node.contactLastName;
				}
		}*/

		function findAge(node)
		{
			if(node.Case_Age !== '%null%')
				{
					return "Age: " + node.Case_Age;
				}
				else if(node.contactAge !== '%null%')
				{
					return "Contact Age: " + node.contactAge;
				}
				else
				{
					return "Contact Age: N/A";
				}
		}

		function findVariant(node)
		{
			if(node.Case_Variant !== '%null%')
				{
					return "Variant: " + node.Case_Variant;
				}
				else
				{
					return "Variant: N/A";
				}
		}

		function handleMouseOver(node) {
			var htmlContent = "<div>";
			htmlContent += "ID: " + node.ID + "<br>";
			//htmlContent += findName(node) + "<br>";
			htmlContent += findAge(node) + "<br>";
			htmlContent += "Record Type: " + recordType(node) + "<br>";
			htmlContent += findVariant(node) + "<br>";
			htmlContent += identifiedDate(node) + "<br>";			
			htmlContent += "Zone: " + node.Case_Zone + "<br>";
			htmlContent += "</div>";
			tooltip.html(htmlContent);
			return tooltip
				.style("top", d3.event.pageY - 10 + "px")
				.style("left", d3.event.pageX + 10 + "px")
				.style("visibility", "visible");
		}

		function handleMouseOut(node) {
			return tooltip.style("visibility", "hidden");
		}

		//Zoom functions
		function zoom_actions() {
			g.attr("transform", d3.event.transform);
		}

		drawData(d3_data);
	};
};

d3Tableau();
