// Basic math function definitions
Math.gcd = function(...terms) {
	if (terms.length === 2) {
		// Euclidean algorithm
		let [a, b] = terms;
		while (b != 0){
			var temp = b;
			b = a % b;
			a = temp;
		}
		return a;
	}
	else {
		return Math.gcd(terms.shift(), Math.gcd(...terms));
	}
}
Math.lcm = function(...terms) {
	if (terms.length === 2) {
		return (terms[0] * terms[1] / Math.gcd(terms[0], terms[1]));
	}
	else {
		return Math.lcm(terms.shift(), Math.lcm(...terms));
	}
}
Math.factors = function(x) {
	let factors = [];
	for (let i = 2; i < x; i++) {
		let a = x / i;
		if (Math.abs(Math.round(a) - a) < 0.00001) {
			factors.push(i);
		}
	}
	return factors;
}
Math.primeFactors = function(x) {
	let factors = []
	while (x % 2 === 0) {
		factors.push(2);
		x /= 2;
	}
	let sqrt = Math.sqrt(x);
	for (let i = 3; i <= sqrt; i += 2) {
		while (x % i === 0) {
			factors.push(i);
			x /= i;
		}
	}
	if (x > 2) {
		factors.push(x);
	}
	return factors;
}

String.prototype.toCapital = function() {
	return this.slice(0, 1).toUpperCase() + this.slice(1);
}

function merge(obj, options) { // deep copies options object onto obj, no return since it's in-place
	Object.keys(options).forEach(option => {
		let value = options[option];
		
		if (Array.isArray(value)) {
			obj[option] = [ ...value ];
		}
		else if (typeof value === "object" && value !== null) {
			if (typeof obj[option] !== "object") {
				obj[option] = {};
			}
			merge(obj[option], value);
		}
		else {
			obj[option] = value;
		}
	});
	return obj;
}

Array.prototype.delete = function(val) {
	let index = this.indexOf(val);
	if (index !== -1) {
		this.splice(index, 1);
		return true;
	}
	return false;
}

function createElement(type, properties) {
	let elem = document.createElement(type);

	function addProperties(elem, properties) {
		Object.keys(properties).forEach(property => {
			if (typeof properties[property] === "object" && !Array.isArray(property) && !(properties[property] instanceof Element)) {
				addProperties(elem[property], properties[property]);
			}
			else {
				if (property === "class") {
					let classes = typeof properties[property] === "string" ? properties[property].split(" ") : properties[property];
					for (let className of classes) {
						elem.classList.add(className);
					}
				}
				else if (property === "parent") {
					properties[property].appendChild(elem);
				}
				else {
					elem[property] = properties[property];
				}
			}
		});
	}
	addProperties(elem, properties);

	return elem;
}
