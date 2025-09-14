#car #arduino

I had this idea that is the following. The basic idea is that I want to create a system that can macro the important menu functions on my Mk8 Golf R's multimedia system because right now, they are nested behind mutiple menu interactions. This makes it unsafe to perform hard commands

**Problem**:
- I want to be able to program quick macros for menu interactions on the golf
- However, to do this there are some hurdles
- How do we control the actual inputs?
- Do we have to send inputs via touchscreen or can we do it via a CANs line
- Is there a way to intercept the video transmission to the media interface and is there a way to send/intercept commands that are being sent to/from the media interface?

**Idea**:
- Create an insert in the CAN lines that can read/send data to the ecu
- Understand the layout of menus in the media system
- Send position data emulating touch inputs to control mock inputs to the media system
- Then we can make macros that input series of touch inputs to navigate the menus

**Some things I think we need:**
- A way to intercept signals from the canbus
- An arduino/rpi to control the system
- A block of buttons to be used for control inputs
- 3d printed mounting brackets for buttons/microcontroller/etc
- A screen to display console, logs, and data readouts from the canbus

**Targeted list of macros**
- Set traction control to fully off setting
- Change drive menu screen in driver display (hard, controlled from steering wheel not media)