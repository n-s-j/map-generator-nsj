const SV = new google.maps.StreetViewService();

export default function SVreq(loc, settings) {
	return new Promise(async (resolve, reject) => {
		await SV.getPanoramaByLocation(new google.maps.LatLng(loc.lat, loc.lng), settings.radius, (res, status) => {
			(async() => {
			if (status != google.maps.StreetViewStatus.OK) return reject();
			if (settings.rejectUnofficial && !settings.rejectOfficial) {
				if (!/^\xA9 (?:\d+ )?Google$/.test(res.copyright)) return reject();
				if (settings.rejectNoDescription && !settings.rejectDescription && !res.location.description && !res.location.shortDescription) return reject();
				if (settings.rejectDescription && (res.location.description || res.location.shortDescription)) return reject();
				if (settings.rejectDateless && !res.imageDate) return reject();
				if (settings.pinpointSearch && res.links.length < 2) return reject();
				if (settings.getIntersection && !settings.pinpointSearch && res.links.length < 3) return reject();
				if (settings.pinpointSearch && (res.links.length == 2 && Math.abs(res.links[0].heading - res.links[1].heading) > settings.pinpointAngle)) return reject();
			}
			if (settings.rejectOfficial) {
				if (/^\xA9 (?:\d+ )?Google$/.test(res.copyright)) return reject();
			}
			const fromDate = Date.parse(settings.fromDate); 
			const toDate = Date.parse(settings.toDate);
			const fromMonth = settings.fromMonth;
			const toMonth = settings.toMonth;
			
			if (!settings.selectMonths){
				if (!settings.checkAllDates || settings.rejectOfficial) {
					if (Date.parse(res.imageDate) < fromDate || Date.parse(res.imageDate) > toDate) return reject();
				}
			}
				
			if (settings.checkAllDates && !settings.selectMonths && !settings.rejectOfficial) {
				if (!res.time?.length) return reject();

				let dateWithin = false;
				for (var i = 0; i < res.time.length; i++) {
					const timeframeDate = Object.values(res.time[i]).find((val) => isDate(val));
					console.log(Object.values(res));
					console.log(res.tiles.worldSize.height);

					if (settings.rejectUnofficial && res.time[i].pano.length != 22) continue; // Checks if pano ID is 22 characters long. Otherwise, it's an Ari
					const iDate = Date.parse(timeframeDate.getFullYear() + "-" + (timeframeDate.getMonth() > 8 ? "" : "0") + (timeframeDate.getMonth() + 1));

					if (iDate >= fromDate && iDate <= toDate) {
						dateWithin = true;
						loc.panoId = res.time[i].pano;
						break;
					}
					
				} 
				if (!dateWithin) return reject();
			} 
				
			if (settings.selectMonths && !settings.rejectOfficial) {
				if (!res.time?.length) return reject();
				let dateWithin = false;

				if (settings.checkAllDates){
					for (var i = 0; i < res.time.length; i++) {
						const timeframeDate = Object.values(res.time[i]).find((val) => isDate(val));

						if (settings.rejectUnofficial && res.time[i].pano.length != 22) continue; // Checks if pano ID is 22 characters long. Otherwise, it's an Ari
						const iDateMonth = timeframeDate.getMonth() + 1;
						
						if (fromMonth <= toMonth){
							if (iDateMonth >= fromMonth && iDateMonth <= toMonth) {
								dateWithin = true;
								loc.panoId = res.time[i].pano;
								break;
							}
						}
						else {
							if (iDateMonth >= fromMonth || iDateMonth <= toMonth) {
								dateWithin = true;
								loc.panoId = res.time[i].pano;
								break;
							}
						}

					} 
					if (!dateWithin) return reject();
				}
				else{
					if (fromMonth <= toMonth){
						if (res.imageDate.slice(5) < fromMonth || res.imageDate.slice(5) > toMonth) return reject();
					}
					else{
						if (res.imageDate.slice(5) < fromMonth && res.imageDate.slice(5) > toMonth) return reject();
					}
				}
				
			}
				
			loc.lat = res.location.latLng.lat();
			loc.lng = res.location.latLng.lng();

			if (settings.adjustHeading && res.links.length > 0) {
				loc.heading = parseInt(res.links[0].heading) + randomInRange(-settings.headingDeviation, settings.headingDeviation);
			}

			if (settings.adjustPitch) loc.pitch = settings.pitchDeviation;

			resolve(loc);
			})();

		}).catch((e) => reject(e.message));
	});
}

const randomInRange = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const isDate = (date) => {
	return new Date(date) !== "Invalid Date" && !isNaN(new Date(date));
};
