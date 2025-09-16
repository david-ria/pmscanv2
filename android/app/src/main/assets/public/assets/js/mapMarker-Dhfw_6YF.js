import{g as e}from"./mapStyles-CsZyDteM.js";const f=(t,l,o,i,s)=>{const{longitude:d,latitude:r}=l;s&&s.remove();let n=`
    <div style="font-family: system-ui; padding: 8px;">
      <div style="font-weight: bold; margin-bottom: 8px; display: flex; align-items: center; gap: 4px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
        PMScan Location
      </div>
      <div style="font-size: 12px; color: #666; margin-bottom: 8px;">
        <div>Lat: ${r.toFixed(6)}°</div>
        <div>Lng: ${d.toFixed(6)}°</div>
        <div>Accuracy: ±${l.accuracy.toFixed(0)}m</div>
      </div>`;o&&(i(o.pm25,"pm25"),i(o.pm1,"pm1"),i(o.pm10,"pm10"),n+=`
      <div style="border-top: 1px solid #e5e7eb; padding-top: 8px;">
        <div style="font-weight: bold; margin-bottom: 4px;">Air Quality</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; font-size: 11px;">
          <div style="text-align: center; color: ${e(o.pm1,i)};">
            <div style="font-weight: bold;">${Math.round(o.pm1)}</div>
            <div>PM1</div>
          </div>
          <div style="text-align: center; color: ${e(o.pm25,i)};">
            <div style="font-weight: bold;">${Math.round(o.pm25)}</div>
            <div>PM2.5</div>
          </div>
          <div style="text-align: center; color: ${e(o.pm10,i)};">
            <div style="font-weight: bold;">${Math.round(o.pm10)}</div>
            <div>PM10</div>
          </div>
        </div>
        <div style="font-size: 10px; color: #666; margin-top: 4px; text-align: center;">
          ${o.timestamp.toLocaleTimeString()}
        </div>
      </div>`),n+="</div>";let c=null;if(t._createMarker&&t._createPopup){const v=o?e(o.pm25,i):"#6b7280";c=t._createMarker({color:v,scale:.8}).setLngLat([d,r]).setPopup(t._createPopup({offset:25}).setHTML(n)).addTo(t)}return t.flyTo({center:[d,r],zoom:15,duration:1500}),c};export{f as createLocationMarker};
