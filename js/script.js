// Find our date picker inputs on the page
const startInput = document.getElementById('startDate');
const endInput = document.getElementById('endDate');
const button = document.querySelector('button');
const gallery = document.getElementById('gallery');
const factText = document.getElementById('spaceFactText');
const modal = document.getElementById('apodModal');
const closeModalButton = document.getElementById('closeModal');
const modalMedia = document.getElementById('modalMedia');
const modalTitle = document.getElementById('modalTitle');
const modalDate = document.getElementById('modalDate');
const modalExplanation = document.getElementById('modalExplanation');

// NASA API key for this project.
const API_KEY = 'nr9N3cg26W1cXyVaelcFmKhdkRwQKutcfGaqVNio';
const APOD_URL = 'https://api.nasa.gov/planetary/apod';
const EARLIEST_DATE = '1995-06-16';
const VIDEO_FALLBACK_IMAGE = 'img/nasa-worm-logo.png';
let galleryItems = [];

const spaceFacts = [
	'The footprints left on the Moon can last for millions of years because there is no wind or rain there.',
	'One day on Venus is longer than one year on Venus.',
	'Neutron stars can spin more than 600 times every second.',
	'Light from the Sun takes about 8 minutes and 20 seconds to reach Earth.',
	'Jupiter has the shortest day of any planet in our solar system, just under 10 hours.',
	'There are more stars in the universe than grains of sand on all of Earth\'s beaches.'
];

// Call the setupDateInputs function from dateRange.js
// This sets up the date pickers to:
// - Default to a range of 9 days (from 9 days ago to today)
// - Restrict dates to NASA's image archive (starting from 1995)
setupDateInputs(startInput, endInput);

function showRandomSpaceFact() {
	const randomIndex = Math.floor(Math.random() * spaceFacts.length);
	factText.textContent = spaceFacts[randomIndex];
}

function getYouTubeEmbedUrl(videoUrl) {
	if (!videoUrl) {
		return '';
	}

	if (videoUrl.includes('youtube.com/watch?v=')) {
		const videoId = videoUrl.split('v=')[1].split('&')[0];
		return `https://www.youtube.com/embed/${videoId}`;
	}

	if (videoUrl.includes('youtu.be/')) {
		const videoId = videoUrl.split('youtu.be/')[1].split('?')[0];
		return `https://www.youtube.com/embed/${videoId}`;
	}

	if (videoUrl.includes('youtube.com/shorts/')) {
		const videoId = videoUrl.split('shorts/')[1].split('?')[0];
		return `https://www.youtube.com/embed/${videoId}`;
	}

	return '';
}

function getCardImageUrl(item) {
	if (item.media_type === 'image') {
		return item.url;
	}

	return item.thumbnail_url || VIDEO_FALLBACK_IMAGE;
}

// Keep the selected range to exactly 9 consecutive days.
function getNineDayRange(startDateString) {
	const today = new Date();
	const earliestDate = new Date(EARLIEST_DATE);
	let startDate = new Date(startDateString);
	let endDate = new Date(startDate);
	endDate.setDate(startDate.getDate() + 8);

	// If the range goes past today, shift back so we still get 9 days.
	if (endDate > today) {
		endDate = new Date(today);
		startDate = new Date(today);
		startDate.setDate(startDate.getDate() - 8);
	}

	// Keep the range inside NASA's valid APOD timeline.
	if (startDate < earliestDate) {
		startDate = new Date(earliestDate);
		endDate = new Date(earliestDate);
		endDate.setDate(endDate.getDate() + 8);
	}

	return {
		startDate: startDate.toISOString().split('T')[0],
		endDate: endDate.toISOString().split('T')[0]
	};
}

function renderGallery(items) {
	const itemList = Array.isArray(items) ? items : [items];
	const sortedItems = [...itemList].sort((a, b) => new Date(b.date) - new Date(a.date));
	galleryItems = sortedItems.slice(0, 9);

	gallery.innerHTML = galleryItems
		.map((item, index) => {
			const imageUrl = getCardImageUrl(item);
			const mediaLabel = item.media_type === 'video' ? '<p><strong>Video Entry</strong></p>' : '';

			return `
				<article class="gallery-item" data-index="${index}">
					<img src="${imageUrl}" alt="${item.title}" data-index="${index}" class="gallery-image" onerror="this.onerror=null;this.src='img/nasa-worm-logo.png';this.style.objectFit='contain';this.style.background='#111';" />
					${mediaLabel}
					<p><strong>${item.title}</strong></p>
					<p>${item.date}</p>
				</article>
			`;
		})
		.join('');
}

function openModal(item) {
	if (item.media_type === 'video') {
		const embedUrl = getYouTubeEmbedUrl(item.url);

		if (embedUrl) {
			modalMedia.innerHTML = `
				<iframe
					src="${embedUrl}"
					title="${item.title}"
					allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
					allowfullscreen>
				</iframe>
				<a class="modal-video-link" href="${item.url}" target="_blank" rel="noopener noreferrer">Open video in a new tab</a>
			`;
		} else {
			const previewImage = item.thumbnail_url || VIDEO_FALLBACK_IMAGE;
			modalMedia.innerHTML = `
				<img src="${previewImage}" alt="${item.title}" onerror="this.onerror=null;this.src='img/nasa-worm-logo.png';this.style.objectFit='contain';this.style.background='#111';" />
				<a class="modal-video-link" href="${item.url}" target="_blank" rel="noopener noreferrer">Open video in a new tab</a>
			`;
		}
	} else {
		const imageUrl = item.hdurl || item.url;
		modalMedia.innerHTML = `<img src="${imageUrl}" alt="${item.title}" />`;
	}

	modalTitle.textContent = item.title;
	modalDate.textContent = item.date;
	modalExplanation.textContent = item.explanation;
	modal.classList.add('open');
	modal.setAttribute('aria-hidden', 'false');
	document.body.style.overflow = 'hidden';
}

function closeModal() {
	modal.classList.remove('open');
	modal.setAttribute('aria-hidden', 'true');
	modalMedia.innerHTML = '';
	document.body.style.overflow = '';
}

async function fetchApodData() {
	const { startDate, endDate } = getNineDayRange(startInput.value);
	startInput.value = startDate;
	endInput.value = endDate;

	gallery.innerHTML = '<div class="placeholder"><p>🔄 Loading space photos…</p></div>';

	const url = `${APOD_URL}?api_key=${API_KEY}&start_date=${startDate}&end_date=${endDate}&thumbs=true`;

	try {
		const response = await fetch(url);

		if (!response.ok) {
			const statusText = response.status === 429
				? 'Too many requests (429). Please try again in a bit.'
				: `HTTP ${response.status}: Could not fetch APOD data.`;
			throw new Error(statusText);
		}

		const data = await response.json();
		renderGallery(data);
	} catch (error) {
		let errorMsg = 'There was a problem loading APOD data.';

		if (error.message && error.message.includes('429')) {
			errorMsg = 'Requests are being rate-limited by NASA right now. Please try again in a moment.';
		}

		gallery.innerHTML = `
			<div class="placeholder">
				<p>${errorMsg}</p>
				<p style="margin-top:10px;font-size:12px;color:#555;">Error: ${error.message}</p>
			</div>
		`;
	}
}

button.addEventListener('click', fetchApodData);

// Open modal when a gallery image is clicked.
gallery.addEventListener('click', (event) => {
	const selectedCard = event.target.closest('.gallery-item');

	if (!selectedCard) {
		return;
	}

	const selectedIndex = Number(selectedCard.dataset.index);
	const selectedItem = galleryItems[selectedIndex];

	if (selectedItem) {
		openModal(selectedItem);
	}
});

showRandomSpaceFact();

closeModalButton.addEventListener('click', closeModal);

modal.addEventListener('click', (event) => {
	if (event.target === modal) {
		closeModal();
	}
});

document.addEventListener('keydown', (event) => {
	if (event.key === 'Escape' && modal.classList.contains('open')) {
		closeModal();
	}
});
