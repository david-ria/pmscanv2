const i=e=>{e.on("mouseenter","track-points",t=>{if(e.getCanvas().style.cursor="pointer",t.features&&t.features[0]){const s=t.features[0];e.setFeatureState({source:"track-points",id:s.id},{hovered:!0});const o=s.properties;if(o&&e._dynamicPopup){const r=e._dynamicPopup({offset:25,closeButton:!1}).setLngLat(t.lngLat).setHTML(`
            <div style="font-family: system-ui; padding: 6px; font-size: 12px;">
              <div style="font-weight: bold; margin-bottom: 4px;">PM2.5: ${Math.round(o.pm25)} µg/m³</div>
              <div style="color: #666; font-size: 10px;">${new Date(o.timestamp).toLocaleTimeString()}</div>
            </div>
          `).addTo(e);t.target._tempPopup=r}}}),e.on("mouseleave","track-points",t=>{e.getCanvas().style.cursor="",t.features&&t.features[0]&&e.setFeatureState({source:"track-points",id:t.features[0].id},{hovered:!1}),t.target._tempPopup&&(t.target._tempPopup.remove(),delete t.target._tempPopup)})},a=e=>{e.on("mouseenter","track-points",t=>{if(e.getCanvas().style.cursor="pointer",t.features&&t.features[0]){const s=t.features[0];e.setFeatureState({source:"track-points",id:s.id},{hovered:!0});const o=s.properties;if(o&&e._dynamicPopup){const r=e._dynamicPopup({offset:25,closeButton:!1}).setLngLat(t.lngLat).setHTML(`
            <div style="font-family: system-ui; padding: 6px; font-size: 12px;">
              <div style="font-weight: bold; margin-bottom: 4px;">PM2.5: ${Math.round(o.pm25)} µg/m³</div>
              <div style="color: #666; font-size: 10px;">${new Date(o.timestamp).toLocaleTimeString()}</div>
            </div>
          `).addTo(e);t.target._tempPopup=r}}}),e.on("mouseleave","track-points",t=>{e.getCanvas().style.cursor="",t.features&&t.features[0]&&e.setFeatureState({source:"track-points",id:t.features[0].id},{hovered:!1}),t.target._tempPopup&&(t.target._tempPopup.remove(),delete t.target._tempPopup)})};export{i as a,a as r};
