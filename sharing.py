import os
from manim import *
import random
import subprocess
import numpy as np

from manim_voiceover import VoiceoverScene
from manim_voiceover.services.gtts import GTTSService


IMG_DIR = "C:\\Users\\Rabi\\Downloads"

def make_video(data: dict):
    config.pixel_width = 1080
    config.pixel_height = 1920
    config.frame_width = 9
    config.frame_height = 16
    title = data["word"]
    img = f'{IMG_DIR}\\{title}.jpg'
    
    if os.path.exists(img):
        print(f"Image : | {title}.jpg | FOUND!")
    else:
        print(f"Image :| {title}.jpg | NOT FOUND!")
        return None

    # Create image mobject with border - using Group instead of VGroup
    imgMOB = ImageMobject(img)
    imgMOB.width = config.frame_width * 0.7
    
    # Add a subtle border to the image
    img_border = RoundedRectangle(
        width=imgMOB.width + 0.1,
        height=imgMOB.height + 0.1,
        corner_radius=0.1,
        color=GOLD,
        stroke_width=2,
        fill_opacity=0
    )
    # Use Group instead of VGroup for mixed mobject types
    imgMOB_with_border = Group(img_border, imgMOB)
    imgMOB.move_to(img_border.get_center())
    
    # Fixed elegant dark background
    background_color = "#1a1e2c"  # Dark navy blue
    background = Rectangle(
        width=config.frame_width,
        height=config.frame_height,
        fill_opacity=1,
        color=background_color
    ).set_z_index(-10)
    
    # Create word mobjects with solid buttons
    def create_word_button(text, color_scheme="neutral"):
        # Color schemes for different states
        colors = {
            "neutral": {"bg": "#2d3349", "text": "#e0e0e0", "border": "#4a516b"},  # Dark purple-gray
            "incorrect": {"bg": "#c44545", "text": "#ffffff", "border": "#a13131"},  # Rich red
            "correct": {"bg": "#45b787", "text": "#ffffff", "border": "#2d8b5c"}  # Vibrant green
        }
        
        scheme = colors[color_scheme]
        
        text_mob = Text(text, color=scheme["text"], font_size=36, weight=BOLD)
        
        # Create solid button with gradient-like appearance using multiple rectangles
        button_bg = RoundedRectangle(
            width=text_mob.width + 1.0,
            height=text_mob.height + 0.6,
            corner_radius=0.3,
            color=scheme["bg"],
            fill_opacity=1,
            stroke_width=2,
            stroke_color=scheme["border"]
        )
        
        # Add a subtle highlight at the top for 3D effect
        highlight = RoundedRectangle(
            width=text_mob.width + 0.9,
            height=text_mob.height * 0.2,
            corner_radius=0.2,
            color=WHITE,
            fill_opacity=0.1,
            stroke_width=0
        )
        highlight.move_to(button_bg.get_top() - [0, text_mob.height * 0.15, 0])
        
        # Use VGroup for button elements since they're all VMobjects
        button = VGroup(button_bg, highlight, text_mob)
        text_mob.move_to(button_bg.get_center())
        
        # Store the text as an attribute for easy access
        button.text = text
        # Set default z_index
        button.set_z_index(1)
        
        return button
    
    # Create ALL buttons with neutral color scheme initially
    # Create the correct word button but with neutral scheme
    correct_word_button = create_word_button(title, color_scheme="correct")
    
    other_words = list(set(data["extra_words"]))
    other_word_buttons = [create_word_button(other_word, color_scheme="correct") for other_word in other_words]
    
    # Combine all words and shuffle
    all_word_buttons = [*other_word_buttons, correct_word_button]
    random.shuffle(all_word_buttons)
    
    # Arrange words in a nice grid pattern instead of single line
    wordsVgMOB = VGroup(*all_word_buttons).arrange_in_grid(rows=2, buff=0.6)
    wordsVgMOB.next_to(imgMOB_with_border, UP, buff=0.8)
    
    # Create holder with better design
    holder_circle = Circle(
        radius=0.4,
        color=GOLD,
        stroke_width=3,
        fill_opacity=0.1,
        fill_color=GOLD
    )
    holder_circle.next_to(imgMOB_with_border, DOWN, buff=1.2)
    
    # Create stylish X and checkmark
    tickxMOB = Text('✗', color="#ff6b6b", font_size=80, weight=BOLD).next_to(holder_circle, DOWN, buff=0.5)
    tickxMOB.set_z_index(2)
    tickrMOB = Text('✓', color="#51cf66", font_size=80, weight=BOLD).next_to(holder_circle, DOWN, buff=0.5)
    tickrMOB.set_z_index(2)

    class Video(VoiceoverScene):
        def construct(self):
            # Add fixed background
            self.add(background)
            self.set_speech_service(GTTSService(lang="en", tld="us"))
            
            # Add image with border
            self.add(imgMOB_with_border)
            
            # Add buttons with a fade-in effect
            self.play(
                *[FadeIn(button, scale=0.8) for button in all_word_buttons],
                run_time=0.5
            )
            self.wait(0.5)
            
            # Animate each incorrect word
            for i, other_button in enumerate(other_word_buttons):
                original_position = other_button.get_center()
                
                # Get the text from the button attribute
                button_text = other_button.text
                
                # Transform button to incorrect state (red)
                new_button = create_word_button(
                    button_text,
                    color_scheme="incorrect"
                )
                new_button.move_to(other_button)
                new_button.set_z_index(2)  # Bring to front during animation
                
                # Move to holder with bounce effect
                self.play(
                    Transform(other_button, new_button),
                    other_button.animate.move_to(holder_circle),
                    run_time=0.4
                )
                
                self.add_sound('incorrect.mp3')
                # Bounce and show X
                self.play(
                    other_button.animate.scale(1.2),
                    FadeIn(tickxMOB, scale=0.5, run_time=0.1)
                )
                self.play(
                    other_button.animate.scale(1/1.2),
                    run_time=0.1
                )
                
                self.wait(0.2)
                
                # Return to original position and restore neutral state
                neutral_button = create_word_button(
                    button_text,
                    color_scheme="neutral"
                )
                neutral_button.move_to(original_position)
                neutral_button.set_z_index(1)
                
                self.play(
                    Transform(other_button, neutral_button),
                    FadeOut(tickxMOB, run_time=0.1)
                )

            # Make all other words disappear
            self.play(
                *[FadeOut(button) for button in other_word_buttons],
                run_time=0.5
            )
            
            # Animate correct word - now transform to correct color scheme when moving
            correct_button = correct_word_button
            original_position = correct_button.get_center()
            
            # Get the text from the button attribute
            button_text = correct_button.text
            
            # Create a larger version of the correct word to appear above the image
            final_word = Text(button_text, color="#ffffff", font_size=72, weight=BOLD)
            final_word.set_color_by_gradient(GREEN, GOLD)
            final_word.next_to(imgMOB_with_border, UP, buff=0.5)
            final_word.set_z_index(3)
            
            # Transform button to correct state (green) while moving to holder
            correct_color_button = create_word_button(
                button_text,
                color_scheme="correct"
            )
            correct_color_button[0].set_stroke(width=4)  # Thicker border for emphasis
            correct_color_button.move_to(correct_button)
            correct_color_button.set_z_index(2)

            
            
            # Move to holder with color transformation
            self.play(
                Transform(correct_button, correct_color_button),
                correct_button.animate.move_to(holder_circle),
                run_time=0.6
            )
            
            # Pulse effect
            self.play(
                correct_button.animate.scale(1.2),
                run_time=0.2
            )
            self.play(
                correct_button.animate.scale(1/1.2),
                run_time=0.2
            )

            # Enhanced confetti with better colors - now generates from behind the correct word
            origin = correct_button.get_center()  # Use correct button position as origin
            confetti = VGroup()
            confetti_colors = ["#ffd43b", "#51cf66", "#339af0", "#ff6b6b", "#ae3ec9", "#ff922b"]

            # Create confetti pieces and set their initial position behind the word
            for _ in range(250):
                shape_type = random.randint(0, 4)
                color = random.choice(confetti_colors)
                
                if shape_type == 0:
                    piece = Rectangle(width=0.1, height=0.25, color=color, fill_opacity=1)
                elif shape_type == 1:
                    piece = RegularPolygon(n=5, color=color, fill_opacity=1).scale(0.12)
                elif shape_type == 2:
                    piece = Circle(radius=0.1, color=color, fill_opacity=1)
                elif shape_type == 3:
                    piece = Triangle(color=color, fill_opacity=1).scale(0.12)
                else:
                    piece = Square(side_length=0.15, color=color, fill_opacity=1)
                
                # Position pieces at the origin
                piece.move_to(origin)
                # Set z_index to be behind the button (button is at z_index 2)
                piece.set_z_index(-5)
                confetti.add(piece)

            # Add confetti to scene (behind the button)
           
            self.add(confetti)
            
            # Slight pause to show confetti gathering behind the word
            self.wait(0.3)
            self.add_sound('ok.mp3')

            # Explosive confetti animation - bursting out from behind the word
            self.play(
                LaggedStartMap(
                    lambda m: m.animate
                        .set_z_index(2)  # Bring to same level as button as they explode
                        .shift(
                            random.uniform(4, 12) * rotate_vector(RIGHT, random.uniform(0, TAU)) +
                            random.uniform(-4, 4) * UP
                        )
                        .rotate(random.uniform(-8*TAU, 8*TAU))
                        .set_opacity(0),
                    confetti,
                    lag_ratio=0.005,
                    run_time=3.5
                )
            )

            # Show checkmark
            self.play(
                GrowFromCenter(tickrMOB),
                correct_button.animate.scale(1.1)
            )
            
            with self.voiceover(text=button_text) as tracker:

            # Fade out the button and show the final word above the image
                self.play(
                    FadeOut(correct_button),
                    FadeOut(tickrMOB),
                    Write(final_word),
                    run_time=tracker.duration
                )
            
            self.wait(2)

    # Set the class name and return it
    Video.__name__ = title
    return Video


# Create the scene class at module level
data = {
    "word": "Camera",
    "extra_words": ["Ball", "Cat", "Dog"]
}

with open("object.json",'r') as objs:
    data=json.load(objs)

for ob in data:
    video=make_video(ob)
    globals()[ob["word"]]=video



if __name__ == '__main__':
    script=os.path.basename(__file__)
    for ob in data:
        subprocess.run(["manim","-pqh",script,ob["word"]],)
