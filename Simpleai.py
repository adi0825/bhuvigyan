import tkinter as tk
from tkinter import ttk, messagebox
import requests
import json
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
from threading import Thread

# ============================================================
# KGIS + NDVI ANALYSIS SYSTEM
# ============================================================

SURVEY_API = "https://kgis.ksrsac.in:9000/genericwebservices/ws/surveyno"
GEOM_API = "https://kgis.ksrsac.in:9000/genericwebservices/ws/geomForSurveyNum"

# ============================================================
# MAIN APP
# ============================================================

class KGISNDVIApp:

    def __init__(self, root):

        self.root = root
        self.root.title("KGIS + NDVI Geospatial Analysis")
        self.root.geometry("1400x850")

        self.lat = None
        self.lon = None

        self.build_ui()

    # ========================================================
    # UI
    # ========================================================

    def build_ui(self):

        main = ttk.Frame(self.root, padding=10)
        main.pack(fill="both", expand=True)

        title = ttk.Label(
            main,
            text="KGIS GEOSPATIAL FRAUD ANALYSIS SYSTEM",
            font=("Arial", 20, "bold")
        )
        title.pack(pady=10)

        # ====================================================
        # FORM
        # ====================================================

        form = ttk.LabelFrame(main, text="Survey Details", padding=15)
        form.pack(fill="x")

        self.entries = {}

        fields = {
            "Village Code": "0201020003",
            "Coordinates": "1853272.6735999994,546739.9227999998",
            "Coordinate Type": "UTM",
            "Distance": "5000",
            "Survey Number": "282"
        }

        row = 0

        for key, value in fields.items():

            ttk.Label(form, text=key).grid(
                row=row,
                column=0,
                padx=5,
                pady=5,
                sticky="w"
            )

            entry = ttk.Entry(form, width=60)

            entry.grid(
                row=row,
                column=1,
                padx=5,
                pady=5
            )

            entry.insert(0, value)

            self.entries[key] = entry

            row += 1

        # ====================================================
        # BUTTONS
        # ====================================================

        btn_frame = ttk.Frame(main)
        btn_frame.pack(fill="x", pady=10)

        self.fetch_btn = ttk.Button(
            btn_frame,
            text="Fetch Survey + Geometry",
            command=self.start_fetch
        )

        self.fetch_btn.pack(side="left", padx=5)

        self.ndvi_btn = ttk.Button(
            btn_frame,
            text="Run NDVI Analysis",
            command=self.run_ndvi
        )

        self.ndvi_btn.pack(side="left", padx=5)

        # ====================================================
        # OUTPUT TEXT
        # ====================================================

        output_frame = ttk.LabelFrame(main, text="API Response")
        output_frame.pack(fill="both", expand=True)

        self.output = tk.Text(
            output_frame,
            height=15,
            font=("Consolas", 10)
        )

        self.output.pack(fill="both", expand=True)

        # ====================================================
        # GRAPH FRAME
        # ====================================================

        graph_frame = ttk.LabelFrame(main, text="NDVI Analysis")
        graph_frame.pack(fill="both", expand=True, pady=10)

        self.graph_frame = graph_frame

    # ========================================================
    # THREAD
    # ========================================================

    def start_fetch(self):

        Thread(target=self.fetch_data, daemon=True).start()

    # ========================================================
    # FETCH DATA
    # ========================================================

    def fetch_data(self):

        try:

            village_code = self.entries["Village Code"].get()
            survey_no = self.entries["Survey Number"].get()

            # =================================================
            # FETCH GEOMETRY
            # =================================================

            geom_url = f"{GEOM_API}/{village_code}/{survey_no}/UTM"

            response = requests.get(geom_url, timeout=30)

            response.raise_for_status()

            try:
                data = response.json()
            except:
                data = response.text

            # =================================================
            # DUMMY LAT/LON EXTRACTION
            # =================================================
            # REAL IMPLEMENTATION:
            # extract polygon coordinates from API response
            # =================================================

            self.lat = 16.9467
            self.lon = 74.6010

            result = {
                "status": "SUCCESS",
                "village_code": village_code,
                "survey_no": survey_no,
                "latitude": self.lat,
                "longitude": self.lon,
                "geometry_data": data
            }

            pretty = json.dumps(result, indent=4)

            self.update_output(pretty)

        except Exception as e:

            self.update_output(f"ERROR:\n{str(e)}")

    # ========================================================
    # NDVI ANALYSIS
    # ========================================================

    def run_ndvi(self):

        if self.lat is None or self.lon is None:

            messagebox.showerror(
                "Error",
                "Fetch geometry first."
            )

            return

        # ====================================================
        # SIMULATED NDVI VALUES
        # ====================================================
        # In production:
        # Use Sentinel-2 / Google Earth Engine
        # ====================================================

        months = [
            "Jan", "Feb", "Mar", "Apr",
            "May", "Jun", "Jul", "Aug",
            "Sep", "Oct", "Nov", "Dec"
        ]

        ndvi = [
            0.12, 0.15, 0.22, 0.35,
            0.48, 0.62, 0.76, 0.81,
            0.73, 0.58, 0.34, 0.19
        ]

        # ====================================================
        # FRAUD ANALYSIS
        # ====================================================

        avg_ndvi = np.mean(ndvi)

        if avg_ndvi < 0.2:
            status = "NO VEGETATION / POSSIBLE FRAUD"

        elif avg_ndvi < 0.45:
            status = "LOW VEGETATION"

        else:
            status = "HEALTHY CROP DETECTED"

        # ====================================================
        # CLEAR OLD GRAPH
        # ====================================================

        for widget in self.graph_frame.winfo_children():
            widget.destroy()

        # ====================================================
        # CREATE GRAPH
        # ====================================================

        fig, ax = plt.subplots(figsize=(10, 4))

        ax.plot(months, ndvi, marker='o')

        ax.set_title("NDVI Time Series Analysis")

        ax.set_xlabel("Month")

        ax.set_ylabel("NDVI")

        ax.grid(True)

        # ====================================================
        # EMBED GRAPH
        # ====================================================

        canvas = FigureCanvasTkAgg(fig, master=self.graph_frame)

        canvas.draw()

        canvas.get_tk_widget().pack(fill="both", expand=True)

        # ====================================================
        # OUTPUT ANALYSIS
        # ====================================================

        analysis = f"""

==============================
NDVI ANALYSIS REPORT
==============================

Latitude  : {self.lat}
Longitude : {self.lon}

Average NDVI : {avg_ndvi:.2f}

Status :
{status}

Interpretation:
- High NDVI indicates healthy vegetation
- Low NDVI indicates poor crop health
- Sudden drops indicate possible damage/fraud

"""

        self.output.insert(tk.END, analysis)

    # ========================================================
    # UPDATE OUTPUT
    # ========================================================

    def update_output(self, text):

        self.output.delete("1.0", tk.END)

        self.output.insert(tk.END, text)

# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":

    root = tk.Tk()

    app = KGISNDVIApp(root)

    root.mainloop()