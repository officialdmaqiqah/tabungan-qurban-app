import Image from "next/image";

export default function PhoneMockup({ imageSrc, altText }: { imageSrc: string, altText: string }) {
  return (
    <div className="relative mx-auto w-[280px] sm:w-[320px] h-[580px] sm:h-[650px] bg-slate-900 rounded-[2.5rem] sm:rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.2)] border-[8px] sm:border-[12px] border-slate-900 overflow-hidden group">
      {/* Notch */}
      <div className="absolute top-0 inset-x-0 h-6 bg-slate-900 rounded-b-3xl w-40 mx-auto z-20 flex justify-center items-end pb-1.5">
        <div className="w-12 h-1.5 bg-slate-800 rounded-full"></div>
      </div>
      
      {/* Screen Content */}
      <div className="relative w-full h-full bg-slate-100 overflow-hidden rounded-[2rem] sm:rounded-[2.5rem]">
        <Image 
          src={imageSrc}
          alt={altText}
          fill
          className="object-cover object-top transition-transform duration-700 group-hover:scale-105"
          sizes="(max-width: 768px) 280px, 320px"
          priority
        />
        {/* Reflection glare overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/30 pointer-events-none"></div>
      </div>

      {/* Side Buttons (decorative) */}
      <div className="absolute top-24 -left-[14px] w-1 h-12 bg-slate-800 rounded-l-md"></div>
      <div className="absolute top-40 -left-[14px] w-1 h-16 bg-slate-800 rounded-l-md"></div>
      <div className="absolute top-32 -right-[14px] w-1 h-16 bg-slate-800 rounded-r-md"></div>
    </div>
  );
}
